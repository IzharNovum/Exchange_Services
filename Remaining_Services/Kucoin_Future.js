import crypto from "crypto";
import PlaceOrderResultFactory from "../Order_Result/PlaceOrderResultFactory.js"
import UserOrder from "../Models/UserOrder.js";
import FetchOrderResultFactory from "../Order_Result/FetchOrderResultFactory.js";
import CancelOrderResult from "../Order_Result/CancelOrderResult.js";



class Kucoin_Future{

    static STATUS_PARTIAL_FILLED = "partial_filled";
    static STATUS_CANCELLED = "cancelled";
    static STATUS_FILLED = "filled";
    static STATUS_ONGOING = "ongoing";
  
    static STATUS_OPENS_CCXT = ["open", "new", "NEW", "ongoing"];
    static STATUS_CANCELS_CCXT = ["CANCELLED", "cancelled", "CANCELED"];
    static STATUS_FILLED_CCXT = ["FILLED", "filled", "closed", "CLOSED"];
  
    static STATE_MAP = {
      canceled: Kucoin_Future.STATUS_CANCELLED,
      mmp_canceled: Kucoin_Future.STATUS_CANCELLED,
      live: Kucoin_Future.STATUS_ONGOING,
      partially_filled: Kucoin_Future.STATUS_PARTIAL_FILLED,
      filled: Kucoin_Future.STATUS_FILLED,
    };




static getBaseUrl(){
    return "https://api-futures.kucoin.com";
}



static buildQueryParams(params){
    return params;
}


static endPoints = {
    Place_Order : "/api/v1/orders",
    Pending_Order : "/api/v1/orders",
    Cancel_Order :(order_id) => `/api/v1/orders/${order_id}`,
    Fetch_Order :(order_id) => `/api/v1/orders/${order_id}`,
    Trades : "/api/v1/recentFills",
    klines : "/api/v1/kline/query"
  }

  static isError(response){
    const HTTP_OK = 200000
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
 static async Authentication(endPoint = null, params = {}, method = "GET"){
    const now = new Date();
    const timestamp = now.getTime();
    const API_Key = process.env.KC_API_KEY;
    const Secret_key = process.env.KC_SECRET_KEY;
    const account = "Izhar@Novum";
    const passphrase = crypto.createHmac('sha256', Secret_key)
                     .update(account)
                     .digest('base64');
    const Version = "3";

    let queryString = "";
    let body = "";

    if(method === "GET"){
        queryString = Object.keys(params ?? {}).length === 0 ? "" : "?" + Object.keys(params).map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`).join("&");
    }else{
        body = JSON.stringify(params);
    }

    //GENERATING SIGNATURE...
    const EndPoint = `${endPoint}${queryString ?? ""}`;
    const presigned = `${timestamp}${method}${EndPoint}${body}`;
    const Signature = crypto.createHmac("sha256", Secret_key).update(presigned).digest("base64");

    return  {
        "KC-API-KEY": API_Key,
        "KC-API-SIGN": Signature,
        "KC-API-TIMESTAMP": timestamp,
        "KC-API-PASSPHRASE": passphrase,
        "KC-API-KEY-VERSION": Version,
        "Content-Type": "application/json",
    }
}


/**
 * Exchange API Caller function.
 * @async
 * @param {string} endPoint - Url endpoint.
 * @param {string || number} params - Function parameters.  
 * @param {string} method - Function Method
 * @returns {Promise<Object>} - Fetches data from the API.
 */
    static async  callExchangeAPI(endPoint, params, method = "GET"){
    try {
        const header = await this.Authentication(endPoint, params, method);
        console.log("Authentication",header);
        const baseUrl = this.getBaseUrl();
        const queryString = method === "GET" ? Object.keys(params ?? {}).length === 0 ? "" : "?" + Object.keys(params).map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`).join("&") : "";
        const url = `${baseUrl}${endPoint}${queryString}`;

        console.log("URL:", url);

        const options = {
            method,
            headers: header,
            ...(method === "GET" ? {} : {body: JSON.stringify(params)}),
        }

        const data = await fetch(url, options);
        const response = await data.json();


        return response;
    } catch (error) {
        console.error("Error CallExchangeAPI!", error);
        throw error;
    }
}

/**
 * Places an order from exchange.
 * @async
 * @param {string} clientOid - Client ID
 * @param {string} side  - buy / sell
 * @param {string} symbol - Trading Pair : BTS-USDT
 * @param {number} leverage - Calculate the margin 
 * @param {number} price - Price of the order
 * @param {number} size - Order Size
 * @returns {Promise<Object>} - Details of placed order
 * @see https://www.kucoin.com/docs/rest/futures-trading/orders/place-order
 */

    static async placeOrderOnExchange(clientOid, side, symbol, leverage, price, size){
        try {
            const params = this.buildQueryParams({
                clientOid : clientOid,
                side : side,
                symbol: symbol,
                leverage: leverage,
                price: price,
                size: size
            });

            const response = await this.callExchangeAPI(this.endPoints.Place_Order, params, "POST");

            console.log("Response", response);

            if(this.isError(response)){
                const msg = response.data?.[0]?.msg ?? response.msg ?? JSON.stringify(response);
                return PlaceOrderResultFactory.createFalseResult(msg, response);
              }

            
            return await this.createSuccessPlaceOrderResult(response);
        } catch (error) {
            console.error("Error Placing An Order", error);
            throw error;
        }
    }

    static async createSuccessPlaceOrderResult(response) {
        try {
            const orderId = response.data.orderId;
            const time = new Date(); 
            const placeOrderResult = PlaceOrderResultFactory.createSuccessResult(
                orderId,
                UserOrder.STATUS_ONGOING,
                time,
                response,
            );
              return placeOrderResult;
        } catch (error) {
          console.warn("Format Not Successed!", error.message);
          throw error;
        }
    }
    
    /**
     * Fetches Open or Penidng order from exchange
     * @async
     * @returns {Promise<object>} - List of the pending orders
     * @see https://www.kucoin.com/docs/rest/futures-trading/orders/get-order-list
     */
    static async pendingOrders(){
        try {
            const response = await this.callExchangeAPI(this.endPoints.Pending_Order, {});

            if (this.isError(response)) {
                console.error("Error message from response", response.msg || "Unknown error");
                const errMgs = response.msg ?? JSON.stringify(response);
                return errMgs;
              }

            console.log("Response From API", response);

            return response;
        } catch (error) {
            console.error("Error Fetching Pending Orders", error);
            throw error;
        }
    }

/**
 * Cancels an existing order from exchange
 * @async
 * @param {string} order_id - Order ID used in path
 * @returns {Promise<object>} - Status of order cancellation.
 * @see https://www.kucoin.com/docs/rest/futures-trading/orders/cancel-order-by-orderid
 */

    static async cancelOrderFromExchange(order_id){
        try {
            const response = await this.callExchangeAPI(this.endPoints.Cancel_Order(order_id), {}, "DELETE");

            console.log("Response From API", response);

            if(this.isError(response)){
                const msg = response.data?.[0]?.sMsg ?? response.msg ?? JSON.stringify(response);
                return new CancelOrderResult(false, msg, response);
              }

            return new CancelOrderResult(true, "Success", response);
        } catch (error) {
            console.error("Error Cancelling Order", error);
            throw error;
        }
    }


    /**
     * Fetches order details form exchange
     * @async
     * @param {number} order_id - Order ID used in path
     * @returns {Promise<object>} - Order Details
     * @see https://www.kucoin.com/docs/rest/futures-trading/orders/get-order-details-by-orderid-clientoid
     */

    static async fetchOrderFromExchange(order_id){
        try {
            const response = await this.callExchangeAPI(this.endPoints.Fetch_Order(order_id), {});

            console.log("Response From API", response);

            if (this.isError(response)) {
                const failureMsg =
                  response?.sMsg ?? response.msg ?? "Unexpected response format or missing critical fields.";
                return FetchOrderResultFactory.createFalseResult(failureMsg);
              }

              return this.createFetchOrderResultFromResponse(response);
        } catch (error) {
            console.error("Error Fetching Order", error);
            throw error;
        }
    }
    static createFetchOrderResultFromResponse(response) {      
        const status = response.data.isActive ? UserOrder.STATUS_ONGOING : UserOrder.STATUS_COMPLETED;
        const avg = parseFloat(response.data.dealValue) / parseFloat(response.data.dealSize) || 0;
        const filled = parseFloat(response.data.dealSize) || 0;
    
        return FetchOrderResultFactory.createSuccessResult(
            status,                   // order status
            avg * filled,            // Total cost
            avg,                     // Average price
            0,                       // No Fee Available in response
            filled,                  // Filled quantity
            new Date(response.data.createdAt).toISOString() // Time
        );
    }
    

    /**
     * Fetches recent Trades details from exchange
     * @async
     * @returns {Promise<object>} - Recent trades details.
     * @see https://www.kucoin.com/docs/rest/futures-trading/fills/get-recent-filled-list
     */
    static async loadTradesForClosedOrder(){
        try {
            const response = await this.callExchangeAPI(this.endPoints.Trades, {});

            if (this.isError(response)) {
                console.error("Error message from response", response.msg || "Unknown error");
                const errMgs = response.msg ?? JSON.stringify(response);
                return errMgs;
              }

            console.log("Response From API", response);

            return response;
        } catch (error) {
            console.error("Error Fetchinng Trades", error);
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
            order: trade.data.orderId || "N/A",
            amount: trade.data.price || 0,
            baseQty: trade.data.size || 0,
            fee: {
              currency: trade.data.feeCurrency || "N/A",
              cost: Math.abs(trade.data.fee) || 0,
            },
            error: trade.error || null,
          }));
      
          return ccxtTrades;
        } catch (error) {
            console.warn("Error Fetching Order Details!", error.message);
            throw  error;
        }
    }


    /**
     * Fetches candles details form exchange
     * @async
     * @param {string} symbol - Trading Pair : BTS-USDT
     * @param {number} granularity - Time range : 1, 2, 3 count as min
     * @returns {Promise<object>} - list of market candles.
     * @see https://www.kucoin.com/docs/rest/futures-trading/market-data/get-klines
     */

    static async fetchKlines(symbol, granularity){
        try {
            const params = this.buildQueryParams({
                symbol: symbol,
                granularity: granularity
            });
    
            const response = await this.callExchangeAPI(this.endPoints.klines, params);
    
            console.log("Response from API:", response);

            if (this.isError(response)) {
                console.error("Error message from response", response.msg || "Unknown error");
                const errMgs = response.msg ?? JSON.stringify(response);
                return errMgs;
              }
            
    
            let klines = response.data.map(kline => [
                kline[0], // time
                kline[1], // open
                kline[2], // high
                kline[3], // low
                kline[4], // close
                kline[5], // no-volume
            ]);
    
            // Sort klines by timestamp
            klines.sort((a, b) => a[0] - b[0]);
    
            return klines;
        } catch (error) {
            console.error("Error Fetching Klines:", error);
            throw error;
        }
    }
    
}


export default Kucoin_Future;