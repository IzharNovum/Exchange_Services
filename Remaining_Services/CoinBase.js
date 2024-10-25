import crypto from "crypto";
import pkg from 'jsonwebtoken';
import PlaceOrderResultFactory from "../Order_Result/PlaceOrderResultFactory.js"
import UserOrder from "../Models/UserOrder.js";
import FetchOrderResultFactory from "../Order_Result/FetchOrderResultFactory.js";
import CancelOrderResult from "../Order_Result/CancelOrderResult.js";
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



   static buildQueryParams(params) {
    return params;
  }

  static getBaseUrl() {
    return "api.coinbase.com";
  }


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

      // console.log("Request URL:", req_url);
      // console.log("Request Headers:", headers);
      if (method === "POST") {
        // console.log("Request Body:", body);
      }

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




// https://docs.cdp.coinbase.com/advanced-trade/reference/retailbrokerageapi_getaccounts
static async FetchAccount(){    //To know the balance and UUID Number...
  const endPoint = "/api/v3/brokerage/accounts";
  try {
      const response = await this.callExchangeApi(endPoint, {});

      if(response.error){
        console.log("Error Message From Response:", response.error);
      }

      return response;
  } catch (error) {
      console.error("Error Fetching balance:", error);  
      throw error;
  }
};
  // https://docs.cdp.coinbase.com/advanced-trade/reference/retailbrokerageapi_getaccount
  static async fetchBalanceOnExchange() {
    const account_uuid = "a0eb990d-ec2e-5765-a071-6089d4134a36";
    const endPoint = `/api/v3/brokerage/accounts/${account_uuid}`;
    try {
      const response = await this.callExchangeApi(endPoint, {});

      if(response.error){
        console.log("Error Message From Response:", response.error);
        return { coins: [] };
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
      return result;
    } catch (error) {
      console.error("Error Fetching Balance:", error.message);
      throw error;
    }
  }
  


  // https://docs.cdp.coinbase.com/advanced-trade/reference/retailbrokerageapi_postorder
      static async placeOrderOnExchange() {
        const endPoint = "/api/v3/brokerage/orders";
        try {
          const params = this.buildQueryParams({
            client_order_id: "2389293812345",
            product_id: "BTC-USD",
            side: "BUY",
            type: "market",
            size: "0.5"
          });

          const response = await this.callExchangeApi(endPoint, params, "POST");


          if(response.error){
            // console.log("Error Message From Response:", response.error);
            const errMsg = response.error ?? response.msg ?? JSON.stringify(response);
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


      // https://docs.cdp.coinbase.com/advanced-trade/reference/retailbrokerageapi_gethistoricalorders
      static async pendingOrders(){
        const endPoint = "/api/v3/brokerage/orders/historical/batch";

        try {
          const response = await this.callExchangeApi(endPoint, {});

          if(response.error){
            console.log("Error Message From Response:", response.error);
          }

          return response;
        } catch (error) {
          console.error("Error Fetching Pending Orders", error);
          throw error;
        }
      }


      // https://docs.cdp.coinbase.com/advanced-trade/reference/retailbrokerageapi_cancelorders
      static async cancelOrderFromExchange(){
        const endPoint = "/api/v3/brokerage/orders/batch_cancel";

        try {
          const params = this.buildQueryParams({
            order_ids: "238923"
          });

          const response = await this.callExchangeApi(endPoint, params, "POST");

          if(response.error){
            const errMsg = response.error ?? response.msg ?? JSON.stringify(response);
            return new CancelOrderResult(false, errMsg, response);
          }

          return new CancelOrderResult(true, "Success", response);
        } catch (error) {
          console.error("Error Placing An Order", error);
          throw error;
        }
      }

      // https://docs.cdp.coinbase.com/advanced-trade/reference/retailbrokerageapi_gethistoricalorder
      static async fetchOrderFromExchange(){
        const order_id = "0000-000000-000000";
        const endPoint = `/api/v3/brokerage/orders/historical/${order_id}`;
        try {
          const response = await this.callExchangeApi(endPoint, {});

          if(response.error){
            const failureMsg =
            response?.sMsg ?? response.msg ?? "Unexpected response format or missing critical fields.";
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
    

      // https://docs.cdp.coinbase.com/advanced-trade/reference/retailbrokerageapi_getfills
      static async loadTradesForClosedOrder(){
        const endPoint = "/api/v3/brokerage/orders/historical/fills";
        try {
          const response = await this.callExchangeApi(endPoint, {});

          if(response.error){
            console.error("Response From API", response);
          }

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



      // https://docs.cdp.coinbase.com/advanced-trade/reference/retailbrokerageapi_getcandles
      static async fetchKlines(){
        const product_id =  'BTC-USD';
        const endPoint = `/api/v3/brokerage/products/${product_id}/candles`;

        try {
          const params = this.buildQueryParams({
            granularity: "ONE_MINUTE",
          })
          const response = await this.callExchangeApi(endPoint, params);

          if(response.error){
            console.error("Response From API", response);
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


      console.log("Response:", klines);

      return klines;
        } catch (error) {
          console.error("Error Fetching Klines", error);
          throw error;
        }
      }


}



export default CoinBase_Service;
