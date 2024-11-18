import crypto from "crypto";
import pkg from 'jsonwebtoken';
import PlaceOrderResultFactory from "../Order_Result/PlaceOrderResultFactory.js"
import UserOrder from "../Models/UserOrder.js";
import FetchOrderResultFactory from "../Order_Result/FetchOrderResultFactory.js";
import CancelOrderResult from "../Order_Result/CancelOrderResult.js";
import OrderParam from "../Models/OrderParam.js";
import ExchangePair from "../Models/ExchangePair.js";
const { sign } = pkg;

class CoinBase_Service{


  static STATUS_PARTIAL_FILLED = "partial_filled";
  static STATUS_CANCELLED = "cancelled";
  static STATUS_FILLED = "filled";
  static STATUS_ONGOING = "ongoing";

  static STATUS_OPENS_CCXT = ["open", "new", "NEW", "ongoing"];
  static STATUS_CANCELS_CCXT = ["CANCELLED", "cancelled", "CANCELED"];
  static STATUS_FILLED_CCXT = ["FILLED", "filled", "closed", "CLOSED"];

  static STATE_MAP = {
    canceled: CoinBase_Service.STATUS_CANCELLED,
    mmp_canceled: CoinBase_Service.STATUS_CANCELLED,
    live: CoinBase_Service.STATUS_ONGOING,
    partially_filled: CoinBase_Service.STATUS_PARTIAL_FILLED,
    filled: CoinBase_Service.STATUS_FILLED,
  };

  /**
   * Instance of the classes.
   */
  // static OrderParam = new OrderParam();
  // static ExchangePair =  new ExchangePair();

  static CB_MAP = {
    '5m' :'FIVE_MINUTE',
    '15m':'FIFTEEN_MINUTE',
    '30m':'THIRTY_MINUTE',
    '1h' :'ONE_HOUR',
    '2h' :'TWO_HOUR',
    '6h' :'FOUR_HOUR',
    '1d' :'ONE_DAY',
    '4h' :'UNKNOWN_GRANULARITY',
  }


   static buildQueryParams(params) {
    return params;
  }

  static getBaseUrl() {
    return "api.coinbase.com";
  }

  static endPoints = {
    Account : "/api/v3/brokerage/accounts",
    Balance :(account_uuid) =>`/api/v3/brokerage/accounts/${account_uuid}`,
    Place_Order : "/api/v3/brokerage/orders",
    Pending_Order : "/api/v3/brokerage/orders/historical/batch",
    Cancel_Order : "/api/v3/brokerage/orders/batch_cancel",
    Fetch_Order :(order_id) => `/api/v3/brokerage/orders/historical/${order_id}`,
    Trades : "/api/v3/brokerage/orders/historical/fills",
    klines :(product_id) => `/api/v3/brokerage/products/${product_id}/candles`
  }


  static isError(response){
    const HTTP_OK = 200; 
    return response.error || response.code && response.code !== HTTP_OK;
  }


/**
 * Authentication for this API.
 * @async
 * @param {string} endPoint - Url endpoint.
 * @param {string || number} params - Function parameters.  
 * @param {string} method - HTTP Method
 * @returns {Promise<authData>} - Authentication Headers 
 */

  static async Authentication(endPoint = null, params, method = "GET") {
    const key_name = process.env.CB_API_KEY;
    const key_secret = process.env.CB_SECRET_KEY;

    // console.log("keys:", key_name, "secret:", key_secret)

    const algorithm = "ES256";
    const url = this.getBaseUrl();
    const uri = `${method} ${url}${endPoint}`;

    const token = sign(
      {
        iss: "cdp",
        nbf: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 120,  // 2-minute expiration
        sub: key_name,
        uri,
      },
      key_secret,
      {
        algorithm,
        header: {
          kid: key_name,
          nonce: crypto.randomBytes(16).toString("hex"),
        },
      }
    );

    // console.log("Generated JWT Token:", token);

    return {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "accept": "application/json",
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

  static async callExchangeApi(endPoint, params = {}, method = "GET") {
    try {
      const { headers } = await this.Authentication(endPoint, params, method);

      let queryString = "";
      let body = "";

      if (method === "GET") {
        queryString = Object.keys(params).length === 0
          ? ""
          : "?" + Object.keys(params)
                .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
                .join("&");
      } else {
        body = JSON.stringify(params);
      }

      const req_url = `https://${this.getBaseUrl()}${endPoint}${queryString}`;

      const options = {
        method,
        body: method === "POST" ? body : undefined,
        headers: headers,
      };

      const response = await fetch(req_url, options);

      const data = await response.json();
      console.log("Response success:", data);

      return data;
    } catch (error) {
      console.error("API Exchange Error:", error.message);
      throw error;
    }
  }


/**
 * Fecthes User balance from the exchange.
 * @async
 * @param {string} account_uuid  account_uuid -  Universal Unique Identifier.
 * @returns {Promise<{coins: Array}>} - User Balance-data
 * @see https://docs.cdp.coinbase.com/advanced-trade/reference/retailbrokerageapi_getaccount
 */

  static async fetchBalanceOnExchange(ExchangePair) {
    try {
      const account_uuid = ExchangePair.getAccntIDUUID();
      const response = await this.callExchangeApi(this.endPoints.Balance(account_uuid), {});

      if(this.isError(response)){
        console.error("Error message from response:", response.error || response.message || "Unknown error");
        throw new Error(response.error || response.message || "Unknown error occured");
      }
  
      let result = { coins: [] };
  
      if (response.account?.available_balance) {
        const balance = parseFloat(response.account.available_balance.value) || 0;  // Available balance
        const frozenBal = parseFloat(response.account.hold?.value) || 0;           // Frozen balance
  
        if (balance > 0 || frozenBal > 0) {
          result.coins.push({
            coin: response.account.currency, 
            free: balance,                   
            used: frozenBal,                
            total: balance + frozenBal        
          });
        }
      }
  
      // If no coins were added, show default values
      if (result.coins.length === 0) {
        result.coins.push({
          coin: "N/A", 
          free: 0,
          used: 0,
          total: 0
        });
      }
  
      // console.log("Formatted Result:", result);
      // return result;
      return response
    } catch (error) {
      console.error("Error Fetching Balance:", error.message);
      throw error;
    }
  }
  
/**
 * Places an order from exchange
 * @async
 * @param {number} client_order_id - client_order_id - client unique ID.
 * @param {string} product_id - tradig pair : BTC-USD.
 * @param {string} side - side - buy / sell
 * @param {string} type - type - market
 * @param {number} size - size 1, 2
 * @returns {Promise<object>} - Order details in PlaceOrderResultFactory format.
 * @see https://docs.cdp.coinbase.com/advanced-trade/reference/retailbrokerageapi_postorder
 */

      static async placeOrderOnExchange(ExchangePair, OrderParam) {
        try {
          const params = this.buildQueryParams({
            client_order_id: ExchangePair.getcliendOrderID(),
            product_id: ExchangePair.getSymbol(),
            side: OrderParam.getSide()
          });

          console.log("parameters:", params)

          const response = await this.callExchangeApi(this.endPoints.Place_Order, params, "POST");


          if(this.isError(response)){
            // console.log("Error Message From Response:", response.error);
            const errMsg = response.error ?? response.message ?? JSON.stringify(response);
            return PlaceOrderResultFactory.createFalseResult(errMsg, response);
          }

          return await this.createSuccessPlaceOrderResult(response);
        } catch (error) {
          console.error("Error Placing An Order", error.message);
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
   * Fecthes Open Or Pending Orders from exchange
   * @async
   * @returns {Promise<object>} - List of open orders
   * @see https://docs.cdp.coinbase.com/advanced-trade/reference/retailbrokerageapi_gethistoricalorders
   */

      static async pendingOrders(){
        try {
          const response = await this.callExchangeApi(this.endPoints.Pending_Order, {});

          if(this.isError(response)){
            console.error("Error message from response:", response.error || response.message || "Unknown error");
            throw new Error(response.error || response.message || "Unknown error occured");
          };

          return response;
        } catch (error) {
          console.error("Error Fetching Pending Orders", error);
          throw error;
        }
      }

      /**
       * Cancels an existing order from exchange
       * @async
       * @param {number} order_ids - order ID
       * @returns {Promise<object>} -  Status of Order Cancellation
       * @see https://docs.cdp.coinbase.com/advanced-trade/reference/retailbrokerageapi_cancelorders
       */

      static async cancelOrderFromExchange(order_ids){
        try {
          const params = this.buildQueryParams({
            order_ids: order_ids
          });

          const response = await this.callExchangeApi(this.endPoints.Cancel_Order, params, "POST");

          if(this.isError(response)){
            const errMsg = response.error ?? response.message ?? JSON.stringify(response);
            return new CancelOrderResult(false, errMsg, response);
          }

          return new CancelOrderResult(true, "Success", response);
        } catch (error) {
          console.error("Error Placing An Order", error);
          throw error;
        }
      }

      /**
       * Fetches order details from exchange
       * @async
       * @param {number} order_ids - order ID
       * @returns {Promise<object>} -  Order deetails.
       * @see https://docs.cdp.coinbase.com/advanced-trade/reference/retailbrokerageapi_gethistoricalorder
       */


      static async fetchOrderFromExchange(order_id){
        try {
          const response = await this.callExchangeApi(this.endPoints.Fetch_Order(order_id), {});

          if(this.isError(response)){
            const failureMsg = response?.error ?? response.message ?? "Unexpected response format or missing critical fields.";
          return FetchOrderResultFactory.createFalseResult(failureMsg);
          }

          return this.createFetchOrderResultFromResponse(response);
        } catch (error) {
          console.error("Error Fetching Order Details", error);
          throw error;
        }
      }

      static createFetchOrderResultFromResponse(response) {      
        const order = response.order;
        const status = response.status ?? this.STATE_MAP[order.status] ?? UserOrder.STATUS_ONGOING;
        const avg = parseFloat(order.average_filled_price) || 0;
        const filled = parseFloat(order.filled_size) || 0;
    
        // Return the result using the extracted and calculated values
        return FetchOrderResultFactory.createSuccessResult(
            status,            // Order status
            avg * filled,      // Total cost (average price * filled quantity)
            avg,               // Average price
            parseFloat(order.fee) || 0, // Fee (default to 0 if not available)
            filled,            // Filled quantity
            new Date(order.created_time).toISOString() // Time in ISO format
        );
    }
    
    /**
     * Fetches recent trades from exchange
     * @async
     * @returns {Promise<object>} - List of recent trades.
     * @see  https://docs.cdp.coinbase.com/advanced-trade/reference/retailbrokerageapi_getfills
     */

      static async loadTradesForClosedOrder(){
        try {
          const response = await this.callExchangeApi(this.endPoints.Trades, {});

          if(this.isError(response)){
            console.error("Error message from response:", response.error || response.message || "Unknown error");
            throw new Error(response.error || response.message || "Unknown error occured");
          };

          return this.convertTradesToCcxtFormat(response ?? {});
        } catch (error) {
          console.error("Error Fetching Trades", error);
          throw error;
        }
      }

      static async convertTradesToCcxtFormat(trades = response) {
        try {
            let tradesArray = [];
    
            if (Array.isArray(trades)) {
                tradesArray = trades;
            } else if (trades && typeof trades === 'object') {
                tradesArray = [trades];
            }
    
            if (tradesArray.length === 0) {
                return [{   //Default Response Format if no trades
                    order: "N/A", 
                    amount: 0,
                    baseQty: 0,
                    fee: {
                        currency: "N/A",  
                        cost: 0,
                    },
                    error: null
                }];
            } else {
                const ccxtTrades = tradesArray.map(trade => ({
                  order: trade.order_id || "N/A",        
                  amount: parseFloat(trade.price) || 0,  
                  baseQty: parseFloat(trade.size) || 0,  
                  fee: {
                      currency: trade.product_id,                 
                      cost: parseFloat(trade.commission) || 0,
                  },
                  error: trade.error || null   
                }));
    
                return ccxtTrades;
            }
        } catch (error) {
            console.error("Error converting trades:", error);
            throw error;
        }
    }


    /**
     * Fetches Market candles data from exchange
     * @async
     * @param {string} product_id  - tradig pair : BTC-USD.
     * @param {string} granularity -time : 1m, 2m
     * @returns {Promise<object>} - List of candle data.
     * @see https://docs.cdp.coinbase.com/advanced-trade/reference/retailbrokerageapi_getcandles
     */

      static async fetchKlines(product_id, granularity){
        try {
          const start = Math.floor(Date.now() / 1000);
        const end = Math.floor(start + this.CB_MAP[granularity] * 300 / 1000);
          const params = this.buildQueryParams({
            granularity: this.CB_MAP[granularity],
            start : start,
            end: end
          });

          const response = await this.callExchangeApi(this.endPoints.klines(product_id), params);

          if(!response){
            console.error("Error message from response:", response.error || response.message || "Unknown error");
            throw new Error(response.error || response.message || "Unknown error occured");
          }


        let klines = response.candles.map(kline => ({
          Time: kline.start,
          Open: kline.open,
          High: kline.high,
          Low: kline.low,
          Close: kline.close,
          Volume: kline.volume
       }));
       
        klines.sort((a, b) => a[0] - b[0]); //Sorted By timestamp


      return klines;
        } catch (error) {
          console.error("Error Fetching Klines", error);
          throw error;
        }
      }
}



export default CoinBase_Service;
