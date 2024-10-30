import crypto from "crypto";
import PlaceOrderResultFactory from "../Order_Result/PlaceOrderResultFactory.js"
import UserOrder from "../Models/UserOrder.js";
import FetchOrderResultFactory from "../Order_Result/FetchOrderResultFactory.js";
import CancelOrderResult from "../Order_Result/CancelOrderResult.js";
import { interval } from "date-fns";



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


    static userName = process.env.USER_NAME;



  static getBaseUrl() {
    return "https://www.tokocrypto.com";
  }

  static buildQueryParams(params) {
    return params;
  }


    //AUTHENTICATION
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


    //   CALL EXCHANGE API
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


//   https://www.tokocrypto.com/apidocs/#account-information-signed
  static async fetchBalanceOnExchange() {
    const endPoint = "/open/v1/account/spot";
    try {
        const response = await this.callExchangeAPI(endPoint, {});
        
        if (response.code !== 0) {
            console.warn("Response Is Not OK!", response);
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


        //   https://www.tokocrypto.com/apidocs/#new-order--signed
        static async placeOrderOnExchange(symbol, side, type, quantity, price){
            const endPoint = "/open/v1/orders";

            try {
                const params = this.buildQueryParams({
                    symbol : symbol,
                    side : side,
                    type : type,
                    quantity : quantity,
                    price : price
                })

                const response = await this.callExchangeAPI(endPoint, params, "POST");

                if(response.code !== 0 ){
                    const msg = response.data?.[0]?.sMsg ?? response.msg ?? JSON.stringify(response);
                    return PlaceOrderResultFactory.createFalseResult(msg, response);
                }

                return await this.createSuccessPlaceOrderResult(response);
            } catch (error) {
                console.error("Error Placing An Order!", error.msg);
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


        // https://www.tokocrypto.com/apidocs/#all-orders-signed
        static async pendingOrders(symbol){
            const endPoint = "/open/v1/orders";

            try {
                const params  = this.buildQueryParams({
                    symbol : symbol
                })
                const response = await this.callExchangeAPI(endPoint, params);

                if(response.code !== 0 ){
                    console.warn("Response Is Not OK!", response);
                }

            return response;
            } catch (error) {
                console.error("Error Fetching Orders!", error.msg)
                throw error;
            }
        }

        // https://www.tokocrypto.com/apidocs/#cancel-order-signed
        static async cancelOrderFromExchange(orderId){
            const endPoint = "/open/v1/orders/cancel";

            try {
                const params = this.buildQueryParams({
                    orderId : orderId, //Fake OrderID
                })
                const response = await this.callExchangeAPI(endPoint, params, "POST");

                if(response.code !== 0){
                    const msg = response.data?.[0]?.sMsg ?? response.msg ?? JSON.stringify(response);
                    return new CancelOrderResult(false, msg, response);
                }

            return new CancelOrderResult(true, "Success", response);
            } catch (error) {
                console.error("Error Cancelling Order!", error.msg);
                throw error;
            }
        };


        // https://www.tokocrypto.com/apidocs/#query-order-signed
        static async fetchOrderFromExchange(orderId){
            const endPoint = "/open/v1/orders/detail";

            try {
                const params = this.buildQueryParams({
                    orderId : orderId, //Fake OrderID
                });

                const response = await this.callExchangeAPI(endPoint, params);

                if(response.code !== 0){
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


        // https://www.tokocrypto.com/apidocs/#account-trade-list-signed
        static async loadTradesForClosedOrder(symbol){
            const endPoint = "/open/v1/orders/trades";

            try {
                const params =  this.buildQueryParams({
                    symbol : symbol
                });

                const response = await this.callExchangeAPI(endPoint, params);

                if(response.code !== 0 ){
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


        // https://www.tokocrypto.com/apidocs/#klinecandlestick-data
        static async fetchKlines(symbol, interval) {
            const endPoint = "https://api.binance.com/api/v1/klines";
            try {
                const params = new URLSearchParams({
                    symbol: symbol,
                    interval: interval,
                }).toString();
        
                const url = `${endPoint}?${params}`;

                const response = await fetch(url);
        
                if (!response.ok) {
                    const error = await response.json();
                    console.warn("Response is not OK!", error);
                    return; // Exit early if there is no data
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