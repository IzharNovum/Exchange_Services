import crypto from "crypto";
import PlaceOrderResultFactory from "../Order_Result/PlaceOrderResultFactory.js"
import UserOrder from "../Models/UserOrder.js";
import FetchOrderResultFactory from "../Order_Result/FetchOrderResultFactory.js";
import CancelOrderResult from "../Order_Result/CancelOrderResult.js";
import OrderParam from "../Models/OrderParam.js";



class TokoCrypto {


    static STATUS_PARTIAL_FILLED = "partial_filled";
    static STATUS_CANCELLED = "cancelled";
    static STATUS_FILLED = "filled";
    static STATUS_ONGOING = "ongoing";
  
    static STATUS_OPENS_CCXT = ["open", "new", "NEW", "ongoing"];
    static STATUS_CANCELS_CCXT = ["CANCELLED", "cancelled", "CANCELED"];
    static STATUS_FILLED_CCXT = ["FILLED", "filled", "closed", "CLOSED"];
  
    static STATE_MAP = {
      canceled: TokoCrypto.STATUS_CANCELLED,
      mmp_canceled: TokoCrypto.STATUS_CANCELLED,
      live: TokoCrypto.STATUS_ONGOING,
      partially_filled: TokoCrypto.STATUS_PARTIAL_FILLED,
      filled: TokoCrypto.STATUS_FILLED,
    };

    static INTERVAL = {
      '1m' :'1m',
      '5m' :'5m',
      '15m': '15m',
      '30m': '30m',
      '1h' :'1h',
      '2h' :'2h',
      '4h' :'4h',
      '6h' :'6h',
      '1d' :'1d',
  };

  
  static getBaseUrl() {
    return "https://www.tokocrypto.com";
  }

  static buildQueryParams(params) {
    return params;
  }


  static endPoints = {
    Balance: "/open/v1/account/spot",
    Place_Order : "/open/v1/orders",
    Pending_Order : "/open/v1/orders",
    Cancel_Order : "/open/v1/orders/cancel",
    Fetch_Order : "/open/v1/orders/detail",
    Trades : "/open/v1/orders/trades",
    klines : "" //Defined in the function
  }

  static isError(response){
    const HTTP_OK = 0
    return response.code !== HTTP_OK;
  }

/**
 * Authentication for this API.
 * @async
 * @param {string} endPoint - Url endpoint.
 * @param {string || number} params - Function parameters.  
 * @param {string} method - HTTP Method
 * @returns {Promise<authData>} - Authentication data. 
 */
  static async AuthHeader(endPoint = null, params = {}, method = "GET") {
    const now = new Date();
    const timestamp = now.getTime();
    const baseUrl = this.getBaseUrl();
    const Toko_API_KEY = process.env.Toko_API_KEY;
    const Toko_SECRET_KEY = process.env.Toko_SECRET_KEY;

    //     //TESTING OF VARIABLES...
    // console.log("api:", Toko_API_KEY);
    // console.log("secret:", Toko_SECRET_KEY);

    let queryString = "";
    let body = "";

    if (method === "GET") {
      queryString =
        Object.keys(params ?? {}).length === 0
          ? ""
          : "?" +
            Object.keys(params)
              .map(
                (key) =>
                  `${encodeURIComponent(key)}=${encodeURIComponent(
                    params[key]
                  )}`
              )
              .join("&");
    } else {
      body = JSON.stringify(params);
    }

        //TESTING OF VARIABLES...
    // console.warn("Checking for query:", queryString);
    // console.warn("Checking for Body:", body);

    // // GENERATING SIGNATURE
    const totalParams = Object.keys(params).map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`).join("&");
    console.log("totalparams:", totalParams);
    const queryWithTimestamp = totalParams
  ? `${totalParams}&timestamp=${timestamp}`
  : `timestamp=${timestamp}`;

    const resigned = crypto.createHmac("sha256", Toko_SECRET_KEY).update(queryWithTimestamp).digest("hex");
    const Signature = encodeURIComponent(resigned);

    const url = `${baseUrl}${endPoint}?${queryWithTimestamp}&signature=${Signature}`;
    

    return {
      url: url,
      headers: {
        "X-MBX-APIKEY": Toko_API_KEY,
        accept: "application/json",
        "Content-Type":
         method === "POST" ? "application/x-www-form-urlencoded" : undefined,
      },
    };
  }


/**
 * Exchange API Caller function.
 * @async
 * @param {string} endPoint - Url endpoint.
 * @param {string || number} params - Function parameters.  
 * @param {string} method - Function Method
 * @returns {Promise<Object>} - Fetches data from the API.
 */
  static async callExchangeAPI(endPoint, params, method = "GET") {
    try {
      const { url, headers } = await this.AuthHeader(endPoint, params, method);

      const options = {
        method,
        headers,
      };


      const fetchData = await fetch(url, options);
      const response = await fetchData.json();

      return response;
    } catch (error) {
      console.error("Error CallExchangeAPI", error);
      throw error;
    }
  }

/**
 * Fecthes User balance from the exchange.
 * @async
 * @returns {Promise<{coins: Array}>} - User Balance-data
 * @see  https://www.tokocrypto.com/apidocs/#account-information-signed
 */

  static async fetchBalanceOnExchange() {
    try {
        const response = await this.callExchangeAPI(this.endPoints.Balance, {});
        
        if (this.isError(response)) {
            console.error("Error message from response", response.msg || "Unknown error");
            const errMgs = response.msg ?? JSON.stringify(response);
            return errMgs;
        }

        let result = { coins: [] };

        if (response?.data?.accountAssets && Array.isArray(response.data.accountAssets)) {
            response.data.accountAssets.forEach((coinInfo) => {
                let availBal = coinInfo.free ? parseFloat(coinInfo.free) : 0;
                let frozenBal = coinInfo.locked ? parseFloat(coinInfo.locked) : 0;

                result.coins.push({
                    coin: coinInfo.asset,
                    status: coinInfo.status,
                    free: availBal,
                    used: frozenBal,
                    total: coinInfo.total ? parseFloat(coinInfo.total) : 0
                });
            });

            // If no coins were added, shows a default values
            if (result.coins.length === 0) {
                result.coins.push({
                    coin: 0,
                    status: 0,
                    free: 0,
                    used: 0,
                    total: 0,
                });
            }
        }

        return result;
    } catch (error) {
        console.error("Error Fetching Balance", error.message);
        throw error;
    }
}

        /**
         * Places an order from exchange
         * @async
         * @param {string} symbol - Trading Pair : MXUSDT
         * @param {string} side - 1, 2
         * @param {string} type - 1
         * @param {number} quantity - quantity of the order
         * @param {number} price - price of the order
         * @returns {Promise<object>} - Details of placed order
         * @see https://www.tokocrypto.com/apidocs/#new-order--signed
         */

        static async placeOrderOnExchange(ExchangePair, OrderParam){
            try {
              const symbol = await ExchangePair.getSymbol();
                const params = this.buildQueryParams({
                    symbol : symbol.toUpperCase(),
                    side : await OrderParam.getSide(),
                    type : await OrderParam.getType(),
                    quantity : await OrderParam.getQty(),
                    price : await OrderParam.getPrice()
                });
                // console.log("Response", params);


                const response = await this.callExchangeAPI(this.endPoints.Place_Order, params, "POST");

                if(this.isError(response)){
                    const msg = response.data?.[0]?.sMsg ?? response.msg ?? JSON.stringify(response);
                    return PlaceOrderResultFactory.createFalseResult(msg, response);
                }

                console.log("response:", response)

                // return await this.createSuccessPlaceOrderResult(response);
                return response
            } catch (error) {
                console.error("Error Placing An Order!", error);
                throw error;
            }
        }

        static async createSuccessPlaceOrderResult(response) {
            try {
                const orderId = response.orderId;
                const time = new Date(); 
                const placeOrderResult = PlaceOrderResultFactory.createSuccessResult(
                    orderId,
                    UserOrder.STATUS_ONGOING,
                    time,
                    response,
                );
                  return placeOrderResult;
            } catch (error) {
              console.error("Format Not Successed!", error.message);
              throw error;
            }
        }

    /**
     * Fetches Open or Penidng order from exchange
     * @async
     * @param {string} symbol - Trading Pair : BTSUSDT.
     * @returns {Promise<object>} - List of the pending orders
     * @see https://www.tokocrypto.com/apidocs/#all-orders-signed
     */
        static async pendingOrders(symbol){
            try {
                const params  = this.buildQueryParams({
                    symbol : symbol
                })
                const response = await this.callExchangeAPI(this.endPoints.Pending_Order, params);

                if(this.isError(response)){
                  console.error("Error message from response", response.msg || "Unknown error");
                  const errMgs = response.msg ?? JSON.stringify(response);
                  return errMgs;
                }

            return response;
            } catch (error) {
                console.error("Error Fetching Orders!", error.msg)
                throw error;
            }
        }

        /**
         * Cancels an existing order from exchange
         * @async
         * @param {number} orderId - Order ID
         * @returns {Promise<object>} - Order details
         * @see https://www.tokocrypto.com/apidocs/#cancel-order-signed
         */

        static async cancelOrderFromExchange(orderId){
            try {
                const params = this.buildQueryParams({
                    orderId : orderId, //Fake OrderID
                })
                const response = await this.callExchangeAPI(this.endPoints.Cancel_Order, params, "POST");

                if(this.isError(response)){
                    const msg = response.data?.[0]?.sMsg ?? response.msg ?? JSON.stringify(response);
                    return new CancelOrderResult(false, msg, response);
                }

            return new CancelOrderResult(true, "Success", response);
            } catch (error) {
                console.error("Error Cancelling Order!", error.msg);
                throw error;
            }
        };

/**
 * Fetches order details from exchange
 * @async
 * @param {number} orderId - Order ID
 * @returns {Promise<object>} - Order details
 * @see https://www.tokocrypto.com/apidocs/#query-order-signed
 */

        static async fetchOrderFromExchange(orderId){
            try {
                const params = this.buildQueryParams({
                    orderId : orderId, //Fake OrderID
                });

                const response = await this.callExchangeAPI(this.endPoints.Fetch_Order, params);

                if(this.isError(response)){
                    const failureMsg =
                    response?.sMsg ?? response.msg ?? "Unexpected response format or missing critical fields.";
                  return FetchOrderResultFactory.createFalseResult(failureMsg);
                }

                return this.createFetchOrderResultFromResponse(response);
            } catch (error) {
                console.error("Error Fetching Order Details!", error.msg);
                throw error;
            }
        }

        static createFetchOrderResultFromResponse(response) {      
            const status = this.STATE_MAP[response.status] ?? UserOrder.STATUS_ONGOING;
            const avg = parseFloat(response.cummulativeQuoteQty) / parseFloat(response.executedQty) || 0;
            const filled = parseFloat(response.executedQty) || 0;
          
            return FetchOrderResultFactory.createSuccessResult(
              status,        //order status
              avg * filled, // Total cost
              avg,          // Average price
              0,            // No Fee Avail In res
              filled,       // Filled quantity
              new Date(response.time).toISOString() // Time
            );
          }


      /**
     * Fetches recent Trades details from exchange
     * @async
     * @param {string} symbol - Trading Pair : BTSUSDT.
     * @returns {Promise<object>} - Recent trades details.
     * @see https://www.tokocrypto.com/apidocs/#account-trade-list-signed
     */
        static async loadTradesForClosedOrder(symbol){
            try {
                const params =  this.buildQueryParams({
                    symbol : symbol
                });

                const response = await this.callExchangeAPI(this.endPoints.Trades, params);

                if(this.isError(response)){
                    const failureMsg =
                    response?.sMsg ?? response.msg ?? "Unexpected response format or missing critical fields.";
                  return failureMsg;
                }

                return this.convertTradesToCcxtFormat(response ?? {});
            } catch (error) {
                console.error("Error Fetching Trades!", error.msg);
                throw error;
            }
        }

        static async convertTradesToCcxtFormat(trades = response) {

            try {
              let tradesArray = "";
        
              if (Array.isArray(trades)) {
                  tradesArray = trades;
              } else if (trades && typeof trades === 'object') {
                  tradesArray = [trades];
              }
          
              const ccxtTrades = tradesArray.map(trade => ({
                  order: trade.orderId || "N/A", 
                  amount: trade.price || 0,
                  baseQty: trade.qty || 0,
                  fee: {
                      currency: trade.commissionAsset || "N/A",
                      cost: Math.abs(trade.commission) || 0,
                  },
                  error: trade.error || null
              }));
          
              return ccxtTrades;
            } catch (error) {
                console.warn("Error Fetching Order Details!", error.message);
                throw new error;
            }
        }


/**
 * Fetches market candles data from exchange
 * @async
 * @param {string} symbol - Trading Pair : BTCUSDT
 * @param {string} interval - Time range : 1s, 2s
 * @returns {Promise<object>} - List of candles data
 * @see https://www.tokocrypto.com/apidocs/#klinecandlestick-data
 */
        static async fetchKlines(symbol, interval) {
            const endPoint = "https://api.binance.com/api/v1/klines";
            try {
                const params = new URLSearchParams({
                    symbol: symbol,
                    interval: this.INTERVAL[interval],
                }).toString();
        
                const url = `${endPoint}?${params}`;

                const response = await fetch(url);
        
                if (!response.ok) {
                    const error = await response.json();
                    console.warn("Response is not OK!", error);
                    return response;
                }
        
                const data = await response.json();

                let klines = data.map(kline => [
                    kline[0], // time
                    kline[1], // open
                    kline[2], // high
                    kline[3], // low
                    kline[4], // close
                    0 // no-volume
                  ]);
              
                  klines.sort((a, b) => a[0] - b[0]); //Sorted By timestamp
              
                return klines;
            } catch (error) {
                console.error("Error Fetching Klines!", error.message);
                throw error;
            }
        }
        

}


export default TokoCrypto;  