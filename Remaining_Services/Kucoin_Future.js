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



    // AUTHENTICATION
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


    // CALL-EXCHANGE-API
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
        // const response = await data.json();


        return data;
    } catch (error) {
        console.error("Error CallExchangeAPI!", error);
        throw error;
    }
}


// https://www.kucoin.com/docs/rest/futures-trading/orders/place-order
    static async placeOrderOnExchange(){
        const endPoint = "/api/v1/orders";
        try {

            const params = this.buildQueryParams({
                clientOid : "5c52e11203aa677f33e493fb",
                side : "BUY",
                symbol: "BTS-USDT",
                leverage: 2,
                price: 104.00,
                size: 1
            });

            const response = await this.callExchangeAPI(endPoint, params, "POST");

            console.log("Response from API", response);

            if(response.code !== 200000 || response.status !== 200){
                const msg = response.data?.[0]?.sMsg ?? response.msg ?? JSON.stringify(response);
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
    

    // https://www.kucoin.com/docs/rest/futures-trading/orders/get-order-list
    static async pendingOrders(){
        const endPoint = "/api/v1/orders";
        try {
            const response = await this.callExchangeAPI(endPoint, {});

            console.log("Response From API", response);

            return response;
        } catch (error) {
            console.error("Error Fetching Pending Orders", error);
            throw error;
        }
    }


    // https://www.kucoin.com/docs/rest/futures-trading/orders/cancel-order-by-orderid
    static async cancelOrderFromExchange(){
        const order_id = "29302323235cdfb21023aswqw909e5ad53";
        const endPoint = `/api/v1/orders/${order_id}`;

        try {
            const response = await this.callExchangeAPI(endPoint, {}, "DELETE");

            console.log("Response From API", response);

            if(response.code !== 200000 || response.status !== 200){
                const msg = response.data?.[0]?.sMsg ?? response.msg ?? JSON.stringify(response);
                return new CancelOrderResult(false, msg, response);
              }

            return new CancelOrderResult(true, "Success", response);
        } catch (error) {
            console.error("Error Cancelling Order", error);
            throw error;
        }
    }


    // https://www.kucoin.com/docs/rest/futures-trading/orders/get-order-details-by-orderid-clientoid
    static async fetchOrderFromExchange(){
        const order_id = "5cdfc138b21023a909e5ad55";
        const endPoint = `/api/v1/orders/${order_id}`;

        try {
            const response = await this.callExchangeAPI(endPoint, {});

            console.log("Response From API", response);

            if (response.code !== 200000 || response.status !== 200) {
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
    


    // https://www.kucoin.com/docs/rest/futures-trading/fills/get-recent-filled-list
    static async loadTradesForClosedOrder(){
        const endPoint = "/api/v1/recentFills";

        try {
            const response = await this.callExchangeAPI(endPoint, {});

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

    // https://www.kucoin.com/docs/rest/futures-trading/market-data/get-klines
    static async fetchKlines(){
        const endPoint = "/api/v1/kline/query";
        try {
            const params = this.buildQueryParams({
                symbol: "BBTC-USTD",
                granularity: "1m"
            });
    
            const response = await this.callExchangeAPI(endPoint, params);
    
            console.log("Response from API:", response);
    
            if (response.code !== '200000') {
                console.error(`API Error: ${response.msg} (Code: ${response.code})`);
                return;
            }
    
            if (!response.data || !Array.isArray(response.data)) {
                console.error("No data or invalid format received from API.");
                return;
            }
    
            // Ensure there is data to process
            if (response.data.length === 0) {
                console.warn("No klines data found.");
                return;
            }
    
            let klines = response.data.map(kline => [
                kline[0], // time
                kline[1], // open
                kline[2], // high
                kline[3], // low
                kline[4], // close
                0 // no-volume
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