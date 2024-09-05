import crypto from "crypto";
import PlaceOrderResultFactory from "../Order_Result/PlaceOrderResultFactory.js"
import UserOrder from "../Models/UserOrder.js";
import FetchOrderResultFactory from "../Order_Result/FetchOrderResultFactory.js";
import CancelOrderResult from "../Order_Result/CancelOrderResult.js";
import dotenv from "dotenv";
import sendLog from "../Log_System/sendLogs.js";


dotenv.config({ path: './Config/.env' });


class huobiExchange{


    static STATUS_PARTIAL_FILLED = "partial_filled";
    static STATUS_CANCELLED = "cancelled";
    static STATUS_FILLED = "filled";
    static STATUS_ONGOING = "ongoing";
  
    static STATUS_OPENS_CCXT = ["open", "new", "NEW", "ongoing"];
    static STATUS_CANCELS_CCXT = ["CANCELLED", "cancelled", "CANCELED"];
    static STATUS_FILLED_CCXT = ["FILLED", "filled", "closed", "CLOSED"];
  
    static STATE_MAP = {
      canceled: huobiExchange.STATUS_CANCELLED,
      mmp_canceled: huobiExchange.STATUS_CANCELLED,
      live: huobiExchange.STATUS_ONGOING,
      partially_filled: huobiExchange.STATUS_PARTIAL_FILLED,
      filled: huobiExchange.STATUS_FILLED,
    };


    static getBaseUrl(){
        return "https://api.huobi.pro";
    }

    static buildQueryParams(params){
        return params;
    }

        // AUTHENTICATION HEADER
    static async authentication(endPoint = "", params = {}, method = "GET") {
        const now = new Date();
        const isoFormat = now.toISOString().replace(/\.\d{3}Z$/, "");
        const HUOBI_API_KEY = process.env.Huobi_API_KEY;
        const HUOBI_SECRET_KEY = process.env.Huobi_SECRET_KEY;
        const SignatureMethod = "HmacSHA256";
        const SignatureVersion = "2";
        const TimeStamp = encodeURIComponent(isoFormat);
        const host = this.getBaseUrl().replace(/^https?:\/\//, '');    
        
        // console.log('Huobi_API_Key:', process.env.Huobi_API_KEY);
        // console.log('Huobi_SECRET_Key:', process.env.Huobi_SECRET_KEY);

        let queryString = "";
        let body = "";

        if (method === "GET") {
            queryString = Object.keys(params ?? {}).length === 0 ? "" : "?" + Object.keys(params).map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`).join("&");
        } else {
            body = JSON.stringify(params);
        }

        // GENERATING SIGNATURE...
        const authKeys = `AccessKeyId=${HUOBI_API_KEY}&SignatureMethod=${SignatureMethod}&SignatureVersion=${SignatureVersion}&Timestamp=${TimeStamp}` + (queryString ? `&${queryString.substring(1)}` : "");
        const preSigned = `${method}\n${host}\n${endPoint}\n${authKeys}`;
        const raw_signature = crypto.createHmac("sha256", HUOBI_SECRET_KEY).update(preSigned).digest("base64");
        const Signature = encodeURIComponent(raw_signature);

        const url = `https://${host}${endPoint}?AccessKeyId=${HUOBI_API_KEY}&SignatureMethod=${SignatureMethod}&SignatureVersion=${SignatureVersion}&Timestamp=${TimeStamp}${queryString ? `&${queryString.substring(1)}` : ""}&Signature=${Signature}`;

        return { url, body };
    }


    // CALL EXCHANGE API...
    static async callExchangeAPI(endPoint, params, method = "GET") {
        try {
            const { url, body } = await this.authentication(endPoint, params, method);
            //LOGS AN ERROR IF ANY AUTH CREDENTIALS MISSING....
            if(!url){
                await sendLog("Huobi-Service", 'Auth', 'CRITICAL', `${endPoint}`, 'Missing Auth Data!');
            }

            const options = {
                    method,
                    body: method === "POST" ? body : undefined,
                    headers: {
                        "Content-Type": "application/json",
                    }
            }

            const fetchData = await fetch(url, options);
            const response = await fetchData.json();

            if (!fetchData.ok) {
                console.error("FetchData Is Not OK!", fetchData.status);
                throw new Error(response.message || `HTTP error! status: ${fetchData.status}`);
            }

            // console.log("Response Data:", response);
            return response;
        } catch (error) {
            //LOGS AN ERROR IF ANY ISSUE WITH API CALL...
            await sendLog("Huobi-Service", 'Call-Exchange-API', 'ERROR', `${endPoint}`, `${error.message}`);
            console.warn("API Call Failed!", error.message);
            throw error;
        }
    }

    
    // https://huobiapi.github.io/docs/spot/v1/en/#get-all-accounts-of-the-current-user
    static async accountDetails() {
        const endPoint = "/v1/account/accounts";
        try {
            const response = await this.callExchangeAPI(endPoint, {});
            console.log("Full Response:", response);

            if (response.status !== "ok") {
                await sendLog("Huobi-Service", "Account-Details-API", "ERROR", `${endPoint}`, "No Response!");
                console.error("Response Is Not OK!", response["err-msg"]);
                throw new Error(`API Error: ${response["err-msg"]}`);
            }
    
        //SUCCESS LOG...
        await sendLog("Huobi-Service", 'Account-Details', 'INFO', `${endPoint}`, 'Successfully Fetched Account Details!');
        return response;
        } catch (error) {
        //LOGS AN ERROR...
        await sendLog("Huobi-Service", 'Account-Details', 'ERROR', `${endPoint}`, `${error.message}`);
        console.error("Error fetching balance:", error.message);
        throw error;
        }
    }

    // https://huobiapi.github.io/docs/spot/v1/en/#get-the-total-valuation-of-platform-assets
    static async accountValue(){
        const endPoint = "/v2/account/valuation";
        try {
            const response = await this.callExchangeAPI(endPoint, {});


            if (response.success !== true) {
                await sendLog("Huobi-Service", "Account-Value-API", "ERROR", `${endPoint}`, "No Response!");
                console.error("Response Is Not OK!", response["err-msg"]);
                throw new Error(`API Error: ${response["err-msg"]}`);
            }

            //SUCCESS LOG...
            await sendLog("Huobi-Service", 'Account-Value', 'INFO', `${endPoint}`, 'Operation Successfull!');
            return response;
        } catch (error) {
        //LOGS AN ERROR...
        await sendLog("Huobi-Service", 'Account-Value', 'ERROR', `${endPoint}`, `${error.message}`);
        console.error("Error fetching balance:", error.message);
        throw error;
        }
    }

    // https://huobiapi.github.io/docs/spot/v1/en/#get-account-balance-of-a-specific-account
    static async fetchBalanceOnExchange() {
        const accountId = "62926999";
        const endPoint = `/v1/account/accounts/${accountId}/balance`
        try {
            const response = await this.callExchangeAPI(endPoint, {});

            if(!response){
                //LOGS AN ERROR...
                await sendLog("Huobi-Service", "Balance-API", "ERROR", `${endPoint}`, "No Response!");
                console.warn("Response Is Not OK!", response);
              }
                let result = { coins: [] };

                if (response?.data?.list && Array.isArray(response.data.list)) {
                    let hasValidCoin = false; // Flag to track if any valid coin was added

                    response.data.list.forEach((coinInfo) => {
                        let availBal = 0;
                        let frozenBal = 0;

                        // For trade balance
                        if (coinInfo.type === "trade") {
                            availBal = coinInfo.available ? parseFloat(coinInfo.available) : 0;
                        }

                        // For frozen balance
                        if (coinInfo.type === "frozen") {
                            frozenBal = coinInfo.balance ? parseFloat(coinInfo.balance) : 0;
                        }

                        if (availBal > 0 || frozenBal > 0) {
                            result.coins.push({
                                coin: coinInfo.currency,
                                type: coinInfo.type,
                                free: availBal,
                                used: frozenBal,
                                total: availBal + frozenBal,
                            });
                            hasValidCoin = true; //flag if there's any valid cois for trading!
                        }
                    });

         // If There is no coins or balance available then this is a default...
                if (!hasValidCoin) {
                    result.coins.push({
                        coin: 0,
                        free: 0,
                        used: 0,
                        total: 0,
                    });
                }
        }

        //SUCCESS LOG...
        await sendLog("Huobi-Service", 'Balance', 'INFO', `${endPoint}`, 'Successfully Fetched Balance!');
        return result;
        } catch (error) {
        //LOGS AN ERROR...
        await sendLog("Huobi-Service", 'Balance', 'ERROR', `${endPoint}`, `${error.message}`);
        console.error("Error fetching balance:", error.message);
        throw error;
        }
    }
    
  
    // https://huobiapi.github.io/docs/spot/v1/en/#place-a-new-order
    static async placeOrderOnExchange(){
        const endPoint = "/v1/order/orders/place";
        try {
            const params = this.buildQueryParams({
                "account-id" : 62926999,
                symbol: "btcusdt",
                type: "buy-limit",
                amount: "10.1",
                price: "6095.65" 
            });

            const response = await this.callExchangeAPI(endPoint, params, "POST");

            if (response.status !== "0k") {
                const msg = response.data?.[0]?.sMsg ?? response.msg ?? JSON.stringify(response);
            //LOGS AN ERROR...
            await sendLog("Huobi-Service", "PlaceOrder-API", "ERROR", `${endPoint}`, `${msg}`);
            return PlaceOrderResultFactory.createFalseResult(msg, response);
              };

            const msg = response.data?.[0]?.sMsg ?? response.msg ?? JSON.stringify(response);

            //SUCCESS LOG...
            await sendLog("Huobi-Service", "Place Order", "INFO", `${endPoint}`, `${msg || "Order Placed!"}`); 
            return this.createSuccessPlaceOrderResult(response);
        } catch (error) {
        //LOGS AN ERROR...
        await sendLog("Huobi-Service", 'Place Order', 'ERROR', `${endPoint}`, `${error.message}` );
        console.warn("Error Placing An Order!", error.message);
        throw new error;
        }
    }


    static createSuccessPlaceOrderResult(response) {
        try {
            const orderId = response?.data;
            const time = new Date();
            const placeOrderResult = PlaceOrderResultFactory.createSuccessResult(
                orderId,
                UserOrder.STATUS_ONGOING,
                time,
                response,
            );
              return placeOrderResult;
        } catch (error) {
              error("Format Not Successed!", error.message);
        }
    }

    

    // https://huobiapi.github.io/docs/spot/v1/en/#get-all-open-orders
    static async pendingOrders(){
        const endPoint = "/v1/order/openOrders";
        try {
            const response = await this.callExchangeAPI(endPoint, {});

            if (response.status !== "ok") {
                await sendLog("Huobi-Service", "PendingOrder-API", "ERROR", `${endPoint}`, "No Response!");
                console.error("Response Is Not OK!", response);
            }

          //SUCCESS LOG...
          await sendLog("Huobi-Service", 'Pending Order', 'INFO', `${endPoint}`, 'Successfully Fetched Pending Order!');
          return response;
        } catch (error) {
          //LOGS AN ERROR...
          await sendLog("Huobi-Service", 'Pending Order', 'ERROR', `${endPoint}`, `${error.message}`);
          console.warn("Error Fetching Pending Orders!", error.message);
          throw new error;
        }
    }

    // https://huobiapi.github.io/docs/spot/v1/en/#submit-cancel-for-an-order
    static async cancelOrderOnExchange(orderID) {
        orderID = orderID;
        const endPoint = `/v1/order/orders/${orderID}/submitcancel`;
        try {
            const response = await this.callExchangeAPI(endPoint, {}, "POST");
    
            if (response.status !== "ok") {
                const msg = response.data?.[0]?.sMsg ?? response.msg ?? JSON.stringify(response);
                //LOGS AN ERROR...
                await sendLog("Huobi-Service", "CancelOrder-API", "ERROR", `${endPoint}`, `${msg}`);
                return new CancelOrderResult(false, msg, response);
            }
    
            //SUCCESS LOG...
            await sendLog("Huobi-Service", "Cancel Order", "INFO", `${endPoint}`, "Order Cancelled!");
            return new CancelOrderResult(true, "Success", response);
        } catch (error) {
            //LOGS AN ERROR...
            await sendLog("Huobi-Service", 'Cancel Order', 'ERROR', `${endPoint}`, `${error.message}`);
            console.warn("Error Cancelling An Order!", error.message);
            throw new error;
        }
    }

    // https://huobiapi.github.io/docs/spot/v1/en/#get-the-order-detail-of-an-order
    static async fetchOrderFromExchange(orderID){
        orderID = "233948934";
        const endPoint = `/v1/order/orders/${orderID}`;
        try {
            const response = await this.callExchangeAPI(endPoint, {});
    
            if (response.status !== "ok") {
                const failureMsg = response.data?.[0]?.sMsg ?? response.msg ?? JSON.stringify(response);
                // LOGS AN ERROR...
                await sendLog("Huobi-Service", "FetchOrder-API", "ERROR", `${endPoint}`, `${failureMsg}`);
                return FetchOrderResultFactory.createFalseResult(failureMsg);
            }
    
            //SUCCESS LOG...
            await sendLog("Huobi-Service", "Fetch Order", "INFO", `${endPoint}`, "Order Fetch Successfull!");
            return this.createFetchOrderResultFromResponse(response);
        } catch (error) {
            //LOGS AN ERROR...
            await sendLog("Huobi-Service", 'Fetch Order', 'ERROR', `${endPoint}`, `${error.message}`);
            console.warn("Error Fetching Order Details!", error.message);
            throw new error;
        }
    }

    static createFetchOrderResultFromResponse(response) {      
        const status =
          this.STATE_MAP[response.data?.state] ?? UserOrder.STATUS_ONGOING;
          const avg = parseFloat(response.data?.price) || 0;
          const filled = parseFloat(response.data?.['field-amount']) || 0;          
      
        return FetchOrderResultFactory.createSuccessResult(
          status,                              //order status
          avg * filled,                        //total cost
          avg,                                 //price coz of no avg in res
          response.data?.['field-fees'] || 0,  //fee
          filled,                              //filled amount
          new Date(response.data?.[0].cTime || 0).toISOString() //Time
        );
      }


    // https://huobiapi.github.io/docs/spot/v1/en/#search-historical-orders-within-48-hours
    static async loadTradesForClosedOrder() {
        const endPoint = "/v1/order/history";
        try {
            const response = await this.callExchangeAPI(endPoint, {});
            // console.log("responsne:", response)
    
            if (response.status !== "ok") {
                const failureMsg = response.data?.[0]?.sMsg ?? response.msg ?? JSON.stringify(response);
                //LOGS AN ERROR...
                await sendLog("Huobi-Service", "Trades-API", "ERROR", `${endPoint}`, `${failureMsg}`);
                console.error("Response Is Not OK!", response["err-msg"]);
                throw new Error(`API Error: ${response["err-msg"]}`);
            }

        //SUCCESS LOG...
        await sendLog("Huobi-Service", "Trades", "INFO", `${endPoint}`, 'Operation Succesfull!');
        return this.convertTradesToCcxtFormat(response ?? {});
        } catch (error) {
        //LOGS AN ERROR...
        await sendLog("Huobi-Service", 'Trades', 'ERROR', `${endPoint}`, `${error.message}`);
        console.error("Error Fetching Trades", error);
        throw new error;
        }
    }
    
    static convertTradesToCcxtFormat(trades = response) {

        let tradesArray = "";
    
        if (Array.isArray(trades)) {
            tradesArray = trades;
        } else if (trades && typeof trades === 'object') {
            tradesArray = [trades];
        }

        const ccxtTrades = tradesArray.map(trade => ({
            order: trade.id || "N/A",  //'id' to 'order'
            amount: parseFloat(trade['field-amount']) || 0,  //'field-amount' to 'amount'
            baseQty: parseFloat(trade['field-amount']) || 0,  //'field-amount' to 'baseQty'
            fee: {
                currency: trade.symbol || "N/A",  //'symbol' to 'feeCcy'
                cost: Math.abs(parseFloat(trade['field-fees'])) || 0,  //'field-fees' to 'cost'
            },
            error: trade.error || null  // Set 'error' if the state is not 'submitted'
        }));
        
        console.log("responsne:", ccxtTrades);
    
        return ccxtTrades;
    }
    
    
    // https://huobiapi.github.io/docs/spot/v1/en/#get-klines-candles
    static async fetchKlines(){
        const endPoint = "/market/history/kline";
        try {
            const params = this.buildQueryParams({
                symbol : "btcusdt",
                period : "1min",
            });

            const response = await this.callExchangeAPI(endPoint, params);

            if (response.status !== "ok") {
                const failureMsg = response.data?.[0]?.sMsg ?? response.msg ?? JSON.stringify(response);
                //LOGS AN ERROR...
                await sendLog("Huobi-Service", "Klines-API", "ERROR", `${endPoint}`, `${failureMsg}`);
                console.error("Response Is Not OK!", response["err-msg"]);
                throw new Error(`API Error: ${response["err-msg"]}`);
            }

            let klines = response.data.map(kline => ({
                id  : kline.id,      // ID or timestamp
                open: kline.open,    // Open price
                high: kline.high,    // High price
                low : kline.low,     // Low price
               close: kline.close,   // Close price
              amount: kline.amount,  // Amount
                 vol: kline.vol,     // Volume
               count: kline.count    // Count
              }));
          
              klines.sort((a, b) => a.id - b.id); //Sorted By ID
          
            //SUCCESS LOG...
            await sendLog("Huobi-Service", "Klines", "INFO", `${endPoint}`, 'Operation Succesfull!');
            return klines;
        } catch (error) {
            //LOGS AN ERROR...
            await sendLog("Huobi-Service", 'Klines', 'ERROR', `${endPoint}`, `${error.message}`);
            console.warn("Error Fetching Klines!", error);
            throw new error;
        }
    }

}


export default huobiExchange;




huobiExchange.authentication();