import crypto from "crypto";
import PlaceOrderResultFactory from "../Order_Result/PlaceOrderResultFactory.js"
import UserOrder from "../Models/UserOrder.js";
import FetchOrderResultFactory from "../Order_Result/FetchOrderResultFactory.js";
import CancelOrderResult from "../Order_Result/CancelOrderResult.js";

// PENDING AUTH

class Crypto{

    static STATUS_PARTIAL_FILLED = "partial_filled";
    static STATUS_CANCELLED = "cancelled";
    static STATUS_FILLED = "filled";
    static STATUS_ONGOING = "ongoing";
  
    static STATUS_OPENS_CCXT = ["open", "new", "NEW", "ongoing"];
    static STATUS_CANCELS_CCXT = ["CANCELLED", "cancelled", "CANCELED"];
    static STATUS_FILLED_CCXT = ["FILLED", "filled", "closed", "CLOSED"];
  
    static STATE_MAP = {
      canceled: Crypto.STATUS_CANCELLED,
      mmp_canceled: Crypto.STATUS_CANCELLED,
      live: Crypto.STATUS_ONGOING,
      partially_filled: Crypto.STATUS_PARTIAL_FILLED,
      filled: Crypto.STATUS_FILLED,
    };
  
    static getBaseUrl(){
        return "https://api.crypto.com/exchange/v1/";
    }

    static buildQueryParams(params){
        return params;
    }
    

static async callExchangeAPI(endPoint, params, method = "GET") {
    const api_key = "eEUE859mhMsX6nXzgFZXRt";
    const secret_key = "X6TB64vU95s74ZRckwEDPc";
    const id = 23243; 
    const nonce = Date.now();

    const request = {
        id: id,
        method: endPoint,
        api_key: api_key,
        nonce: nonce,
    };

    // Add additional parameters if they exist
    if (params && Object.keys(params).length > 0) {
        request.params = params.params || {}; // Add params if provided
    }

    // Create a sorted parameter string
    const paramString = this.getParamString(params.params); 

    // Create the signature payload
    const sigPayload = `${endPoint}${id}${api_key}${paramString}${nonce}`;
    request.sig = crypto.createHmac('sha256', secret_key).update(sigPayload).digest('hex'); 



    const headers = this.getCommonHeaders(endPoint, params, method); // Get headers
    const queryString = Object.keys(params ?? {}).length === 0 ? "" : "?" + Object.keys(params).map((key)=> `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`).join("&");

    const url = this.getBaseUrl() + endPoint + queryString; // Construct the full URL
    const options = {
        method,
        headers,
        ...(method === "POST" ? { body: JSON.stringify(request) } : {})
    };
    


const response = await fetch(url, options);
    // Check response and return JSON
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorText}`);
    }
    return await response.json();
}

static getCommonHeaders(endPoint, params, method) {
    return {
        'Content-Type': 'application/json',
    };
}

// Ensure you have a method defined for getParamString()
static getParamString(params) {
    if (!params) return '';
    const sortedKeys = Object.keys(params).sort();
    return sortedKeys.map(key => `${key}${params[key]}`).join('');
}






    // https://exchange-docs.crypto.com/exchange/v1/rest-ws/index.html#private-user-balance
    static async fetchBalanceOnExchange(){
        const endPoint = "private/user-balance";
        try {
            const response = await this.callExchangeAPI(endPoint, {}, "POST");

            console.log("Response From Balance API:", response);

            return response;
        } catch (error) {
            console.error("Error Fetching Balance", error);
            throw error;
        }
    }

    // https://exchange-docs.crypto.com/exchange/v1/rest-ws/index.html#private-create-order
    static async placeOrderOnExchange(){
        const endPoint = "private/create-order";
        try {

            const params = this.buildQueryParams({
                instrument_name: "BTCUSD-PERP",
                side: "BUY",
                type: "LIMIT",
                quantity: "2",
                price: "50000.5",
            })
            const response = await this.callExchangeAPI(endPoint, params, "POST");

            if(response.error){
                // console.log("Error Message From Response:", response.error);
                const errMsg = response.error ?? response.msg ?? JSON.stringify(response);
                return PlaceOrderResultFactory.createFalseResult(errMsg, response);
              }
    
              return await this.createSuccessPlaceOrderResult(response);
        } catch (error) {
            console.error("Error Placing An Order", error);
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
  


    // https://exchange-docs.crypto.com/exchange/v1/rest-ws/index.html#private-get-open-orders
    static async pendingOrders(){
        const endPoint="private/get-open-orders";
        try {
            const params =  this.buildQueryParams({
                 instrument_name: "BTCUSD-PERP"
            })
            const response = await this.callExchangeAPI(endPoint, params, "POST");

            console.log("Response From Pending Order", response);

            return response;
        } catch (error) {
            console.error("Error Fetching Pending Order Details", error);
            throw error;
        }
    }


    // https://exchange-docs.crypto.com/exchange/v1/rest-ws/index.html#private-cancel-order
    static async cancelOrderFromExchange(){
        const endPoint = "private/cancel-order";
        try {
            const params = this.buildQueryParams({
                order_id:"18342311"
            });

            const response = await this.callExchangeAPI(endPoint, params, "POST");

            if(response.error){
                const errMsg = response.error ?? response.msg ?? JSON.stringify(response);
                return new CancelOrderResult(false, errMsg, response);
              }
    
              return new CancelOrderResult(true, "Success", response);
        } catch (error) {
            console.error("Error Cancelling An Order", error);
            throw error;
        }
    }

    // https://exchange-docs.crypto.com/exchange/v1/rest-ws/index.html#private-get-order-detail
    static async fetchOrderFromExchange(){
        const endPoint = "private/get-order-detail";
        try {
            const params = this.buildQueryParams({
                order_id:"19848525"
            });

            const response =  await this.callExchangeAPI(endPoint, params, "POST");

            if(response.error){
                const failureMsg =
                response?.message ?? response.message ?? "Unexpected response format or missing critical fields.";
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


    // https://exchange-docs.crypto.com/exchange/v1/rest-ws/index.html#public-get-candlestick
    static async  fetchKlines(){
        const endPoint = "public/get-candlestick";
        try {
            const params = this.buildQueryParams({
                instrument_name:"BTCUSD-PERP",
                period:"1m"
            })
            const response = await this.callExchangeAPI(endPoint, params, "GET");
          
            if(response.error){
                console.error("Response From API", response);
              }

              let klines = response.result.data.map(kline => ({
                Time: kline.t,
                Open: kline.o,
                High: kline.h,
                Low: kline.l,
                Close: kline.c,
                Volume: kline.v
             }));
              klines.sort((a, b) => a[0] - b[0]); //Sorted By timestamp


            console.log("Response:", klines);

            return klines;
        } catch (error) {
            console.error("Error Fetching Klines", error);
            throw error;
        }
    }

    
}



export default Crypto;