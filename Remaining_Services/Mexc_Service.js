import crypto from "crypto";
import PlaceOrderResultFactory from "../Order_Result/PlaceOrderResultFactory.js"
import UserOrder from "../Models/UserOrder.js";
import FetchOrderResultFactory from "../Order_Result/FetchOrderResultFactory.js";
import CancelOrderResult from "../Order_Result/CancelOrderResult.js";


class Mexc_Service{


    static STATUS_PARTIAL_FILLED = "partial_filled";
    static STATUS_CANCELLED = "cancelled";
    static STATUS_FILLED = "filled";
    static STATUS_ONGOING = "ongoing";
  
    static STATUS_OPENS_CCXT = ["open", "new", "NEW", "ongoing"];
    static STATUS_CANCELS_CCXT = ["CANCELLED", "cancelled", "CANCELED"];
    static STATUS_FILLED_CCXT = ["FILLED", "filled", "closed", "CLOSED"];
  
    static STATE_MAP = {
      canceled: Mexc_Service.STATUS_CANCELLED,
      mmp_canceled: Mexc_Service.STATUS_CANCELLED,
      live: Mexc_Service.STATUS_ONGOING,
      partially_filled: Mexc_Service.STATUS_PARTIAL_FILLED,
      filled: Mexc_Service.STATUS_FILLED,
    };
    



    static getBaseUrl(){
        return "https://api.mexc.com";
    }

    static buildQueryParams(params){
        return params;
    }


    static async Authentication(endPoint = null, params = {}, method = "GET") {
        const timeStamp = Date.now().toString();
        const uri = this.getBaseUrl();    
        const api_key = process.env.API_KEY_Mexc;
        const secret_key = process.env.SECRECT_KEY_Mexc;
        // Add timestamp and recvWindow to params
        params.timestamp = timeStamp;
    
        let queryString = "";
        let body = "";
    
        if (method === "GET") {
            queryString = "?" + Object.keys(params).map((key) => 
                `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`
            ).join("&");
        } else {
            body = JSON.stringify(params);
        }
    
        const totalParams = `${queryString.slice(1)}${body}`;
    

        const signature = crypto.createHmac("sha256", secret_key).update(totalParams).digest("hex");
    
        if (method === "GET") {
            queryString += `&signature=${encodeURIComponent(signature)}`;
        } else {
            body = body ? `${body}&signature=${signature}` : `signature=${signature}`;
        }
    
        const url = `${uri}${endPoint}${queryString}`;
    
        return {
            headers: {
                "X-MEXC-APIKEY": api_key,
                "Content-Type": "application/json",
            },
            url,
            ...(method !== "GET" && { body })
        };
    }
    



    // Call-Exchange-API
    static async callExchangeAPI(endPoint, params, method = "GET"){
        try {
            const { headers, url } = await this.Authentication(endPoint, params, method);

             const options = {
                method,
                headers,
                ...(method === 'GET' ? {} : { body: JSON.stringify(params) })
             }

        console.warn("options:", options);


             const fetchData = await fetch(url, options);
             const response = await fetchData.json();

             return response;
        } catch (error) {
            console.error("API Error:", error);
            throw error;
        }
    }


    // https://mexcdevelop.github.io/apidocs/spot_v3_en/#account-information
    static async fetchBalanceOnExchange() {
        const endPoint = "/api/v3/account";
        try {
            const response = await this.callExchangeAPI(endPoint, {});
    
            console.log("Response From API:", response);
    
            let result = { coins: [] };
    
            // Check if the response data is an array
            if (Array.isArray(response.data)) {
                console.log("Account Data Array:", response.data);
    
                response.data.forEach((coinInfo) => {
                    let availBal = coinInfo.available ? parseFloat(coinInfo.available) : 0;
                    let frozenBal = coinInfo.frozen ? parseFloat(coinInfo.frozen) : 0;
    
                    result.coins.push({
                        coin: coinInfo.coinName || "N/A", 
                        free: availBal,
                        used: frozenBal,
                        total: availBal + frozenBal,
                    });
                });
            }
    
            // If no coins were added, shows default values
            if (result.coins.length === 0) {
                result.coins.push({
                    coin: "N/A",
                    free: 0,
                    used: 0,
                    total: 0,
                });
            }
    
            return result;
            // return response;
        } catch (error) {
            console.error("Error fetching balance:", error);
            throw error;
        }
    }
    



       // https://mexcdevelop.github.io/apidocs/spot_v3_en/#new-order
       static async placeOrderOnExchange(symbol, type, side, price, quantity){
        const endPoint = "/api/v3/order";
        try {
            const params =  this.buildQueryParams({
                symbol: symbol,
                type: type,
                side: side,
                price: price,
                quantity: quantity
            });

            const response = await this.callExchangeAPI(endPoint, params, "POST");

            if (response.code !== "200") {
                const errMsg = response.error ?? response.msg ?? JSON.stringify(response);
                return PlaceOrderResultFactory.createFalseResult(errMsg, response);
            } else {
                console.log("Response is OK:", response);
            }

            return await this.createSuccessPlaceOrderResult(response);
        } catch (error) {
            console.error("Error Placing An Order:", error);
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

    // https://mexcdevelop.github.io/apidocs/spot_v3_en/#current-open-orders
    static async pendingOrders(symbol){
        const endPoint = "/api/v3/openOrders";
        try {
            const params = this.buildQueryParams({
                symbol: symbol
            });

            const response =  await this.callExchangeAPI(endPoint, params);

            if (response.code !== "200") {
                console.log("Response Is Not OK:", response);
            } else {
                console.log("Response is OK:", response);
            }

            return response;
        } catch (error) {
            console.error("Error Fetching Orders:", error);
            throw error;
        }
    }
    

    // https://mexcdevelop.github.io/apidocs/spot_v3_en/#cancel-order
    static async cancelOrderFromExchange(id, symbol){
        const endPoint = "/api/v3/order";
        try {
            const params = this.buildQueryParams({
                id: id,
                symbol: symbol
            });
    
            const response = await this.callExchangeAPI(endPoint, params, "DELETE");
    

            if (response.code !== "200") {
                const errMsg = response[3] ?? JSON.stringify(response);
                return new CancelOrderResult(false, errMsg, response);

            } else {
                console.log("Response is OK:", response);
                return new CancelOrderResult(true, "Success", response);
            }
        } catch (error) {
            console.error("Error Cancelling Orders:", error);
            throw error;
        }
    }
    
    // https://mexcdevelop.github.io/apidocs/spot_v3_en/#query-order
    static async fetchOrderFromExchange(orderId, symbol){
        const endPoint = "/api/v3/order";
        try {
            const params = this.buildQueryParams({
                orderId: orderId,
                symbol: symbol
            });

            const response = await this.callExchangeAPI(endPoint, params);

            if (response.code !== "200") {
                    const failureMsg =
                      response?.sMsg ?? response.msg ?? "Unexpected response format or missing critical fields.";
                    return FetchOrderResultFactory.createFalseResult(failureMsg);
            }
            console.log("Response Is Not OK:", response);


            return this.createFetchOrderResultFromResponse(response);
        } catch (error) {
            console.error("Error fetching Order:", error);
            throw error;
        }
    }

    static createFetchOrderResultFromResponse(response) {
        const status = response.status ?? UserOrder.STATUS_ONGOING; 
        const avg = parseFloat(response.price) || 0; 
        const filled = parseFloat(response.executedQty) || 0; 
        const totalCost = parseFloat(response.cummulativeQuoteQty) || avg * filled; 
        const time = response.time; 
        let feeAmount = 0; 
    
        return FetchOrderResultFactory.createSuccessResult(
            status,     // Order status
            totalCost,  // Total cost
            avg,        // Average price
            feeAmount,  // Fee amount (0 if not provided)
            filled,     // Filled quantity
            time        // Time
        );
    }
    
    

    // https://mexcdevelop.github.io/apidocs/spot_v3_en/#account-trade-list
    static async loadTradesForClosedOrder(symbol){
        const endPoint = "/api/v3/myTrades";

        try {
            const params = this.buildQueryParams({
                symbol: symbol
            });
            const response = await this.callExchangeAPI(endPoint, params);


            if (response.code !== "200") {
                console.log("Response Is Not OK:", response);
            }

            // console.log("Response Is Not OK:", response);


            return this.convertTradesToCcxtFormat(response ?? {});
            // return response;
        } catch (error) {
            console.error("Error fetching Trades:", error);
            throw error;
        }
    }

    static async convertTradesToCcxtFormat(trades = []) {
        try {
            let tradesArray = [];

            if (Array.isArray(trades)) {
                tradesArray = trades;
            } else if (trades && typeof trades === 'object') {
                tradesArray = [trades];
            }
            
            
            if (tradesArray.length === 0) {
                return [{   
                    order: "N/A", 
                    amount: 0,
                    baseQty: 0,
                    fee: { currency: "N/A", cost: 0 },
                    error: null
                }];
            } else {
                return tradesArray.map(trade => ({
                    order: trade.orderId || "N/A", 
                    amount: parseFloat(trade.price) || 0,       
                    baseQty: parseFloat(trade.qty) || 0,     
                    fee: {
                        currency: trade.symbol || "N/A",  
                        cost: Math.abs(trade.commission) || 0,
                    },
                    error: trade.msg || null
                }));                
            }
        } catch (error) {
            console.error("Error converting trades:", error);
            throw error;
        }
    }
    


    // https://mexcdevelop.github.io/apidocs/spot_v3_en/#kline-candlestick-data
    static async fetchKlines(symbol, interval){
        const endPoint = "/api/v3/klines";
        try {
            const params = this.buildQueryParams({
                symbol: symbol,
                interval : interval
            });
            const response = await this.callExchangeAPI(endPoint, params);


            if (response.code > "00000") {
                console.log("Response Is Not OK:", response);
            }

            let klines = response.map(kline => [
                kline[0], // time
                kline[1], // open
                kline[2], // high
                kline[3], // low
                kline[4], // close
                kline[5], // volume
            ]);
             
              klines.sort((a, b) => a[0] - b[0]); //Sorted By timestamp

            return klines;

            // return response;
        } catch (error) {
            console.error("Error fetching klines:", error);
            throw error;
        }
    }

}



export default Mexc_Service;