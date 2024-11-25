import crypto from "crypto";
import PlaceOrderResultFactory from "../Order_Result/PlaceOrderResultFactory.js"
import UserOrder from "../Models/UserOrder.js";
import FetchOrderResultFactory from "../Order_Result/FetchOrderResultFactory.js";
import CancelOrderResult from "../Order_Result/CancelOrderResult.js";
import OrderParam from "../Models/OrderParam.js";
import ExchangePair from "../Models/ExchangePair.js";


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
    }

    static getBaseUrl(){
        return "https://api.mexc.com";
    }

    static buildQueryParams(params){
        return params;
    }


    static endPoints = {
        Balance: "/api/v3/account",
        Place_Order : "/api/v3/order",
        Pending_Order : "/api/v3/openOrders",
        Cancel_Order : "/api/v3/order",
        Fetch_Order : "/api/v3/order",
        Trades : "/api/v3/myTrades",
        klines : "/api/v3/klines"
      }
    
      static isError(response){
        const HTTP_OK = 200
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

    static async Authentication(endPoint = null, params = {}, method = "GET") {
        const timeStamp = Date.now().toString();
        const uri = this.getBaseUrl();    
        const api_key = process.env.API_KEY_Mexc;
        const secret_key = process.env.SECRECT_KEY_Mexc;
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
    



/**
 * Exchange API Caller function.
 * @async
 * @param {string} endPoint - Url endpoint.
 * @param {string || number} params - Function parameters.  
 * @param {string} method - Function Method
 * @returns {Promise<Object>} - Fetches data from the API.
 */
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

/**
 * Fecthes User balance from the exchange.
 * @async
 * @returns {Promise<{coins: Array}>} - User Balance-data
 * @see  https://mexcdevelop.github.io/apidocs/spot_v3_en/#account-information
 */

    static async fetchBalanceOnExchange() {
        try {
            const response = await this.callExchangeAPI(this.endPoints.Balance, {});
    
            if(!response){
                console.error("Error message from response", response.msg || "Unknown error");
                const errMgs = response.msg ?? JSON.stringify(response);
                return errMgs;
            }

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
    


/**
 * Places an order from exchange.
 * @async
 * @param {string} symbol  - Trading Pair : BTS-USDT.
 * @param {string} type - Limit, Market
 * @param {string} side - Buy / Sell
 * @param {string} price - Price of the order
 * @param {string} quantity - quantity of the order.
 * @returns {Promise<Object>} - Details of placed order
 * @see https://mexcdevelop.github.io/apidocs/spot_v3_en/#new-order
 */

       static async placeOrderOnExchange(ExchangePair, OrderParam){
        try {
            const symbol = await ExchangePair.getSymbol();
            const params =  this.buildQueryParams({
                symbol: symbol.toUpperCase(),
                side: await OrderParam.getSide(),
                type: await OrderParam.getType(),
                price: await OrderParam.getPrice(),
                quantity: await OrderParam.getQty()
            });

            // console.log("Response", params);

            const response = await this.callExchangeAPI(this.endPoints.Place_Order, params, "POST");

            if (this.isError(response)) {
                const errMsg = response.error ?? response.msg ?? JSON.stringify(response);
                return PlaceOrderResultFactory.createFalseResult(errMsg, response);
            };

            console.log("Response is OK:", response);

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

    /**
     * Fetches Open or Penidng order from exchange
     * @async
     * @param {string} symbol - Trading Pair : BTS-USDT.
     * @returns {Promise<object>} - List of the pending orders
     * @see https://mexcdevelop.github.io/apidocs/spot_v3_en/#current-open-orders
     */
    static async pendingOrders(symbol){
        try {
            const params = this.buildQueryParams({
                symbol: symbol
            });

            const response =  await this.callExchangeAPI(this.endPoints.Pending_Order, params);
            
            if(!response){
                console.error("Error message from response", response.msg || "Unknown error");
                const errMgs = response.msg ?? JSON.stringify(response);
                return errMgs;
            }

            console.log("Response:", response);

            return response;
        } catch (error) {
            console.error("Error Fetching Orders:", error);
            throw error;
        }
    }
    

    /**
     * Cancels an existing order from exchange
     * @async
     * @param {string} orderId - Order ID used in path
     * @param {string} symbol - Trading Pair : BTS-USDT.
     * @returns {Promise<object>} - Status of order cancellation.
     * @see https://mexcdevelop.github.io/apidocs/spot_v3_en/#cancel-order
     */

    static async cancelOrderFromExchange(orderId, symbol){
        try {
            const params = this.buildQueryParams({
                orderId: orderId,
                symbol: symbol
            });
    
            const response = await this.callExchangeAPI(this.endPoints.Cancel_Order, params, "DELETE");
    

            if (this.isError(response)) {
                const errMsg = response?.sMsg ?? response.msg ??JSON.stringify(response);
                return new CancelOrderResult(false, errMsg, response);
            };


            console.log("Response is OK:", response);
            return new CancelOrderResult(true, "Success", response);
        } catch (error) {
            console.error("Error Cancelling Orders:", error);
            throw error;
        }
    }
    

    /**
     * Fetches order details form exchange
     * @async
     * @param {string} symbol - Trading Pair : BTS-USDT.
     * @param {number} orderId - Order ID used in path
     * @returns {Promise<object>} - Order Details
     * @see https://mexcdevelop.github.io/apidocs/spot_v3_en/#query-order
     */

    static async fetchOrderFromExchange(orderId, symbol){
        try {
            const params = this.buildQueryParams({
                orderId: orderId,
                symbol: symbol
            });

            const response = await this.callExchangeAPI(this.endPoints.Fetch_Order, params);

            if (this.isError(response)) {
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
    
    
    /**
     * Fetches recent Trades details from exchange
     * @async
     * @param {string} symbol - Trading Pair : BTS-USDT.
     * @returns {Promise<object>} - Recent trades details.
     * @see https://mexcdevelop.github.io/apidocs/spot_v3_en/#account-trade-list
     */
    static async loadTradesForClosedOrder(symbol){
        try {
            const params = this.buildQueryParams({
                symbol: symbol
            });
            const response = await this.callExchangeAPI(this.endPoints.Trades, params);


            if (!response) {
                console.error("Error message from response", response.msg || response.error || "Unknown error");
                const errMgs = response.msg ??  response.error ?? JSON.stringify(response);
                return errMgs;
            }

            console.log("Response:", response);


            return this.convertTradesToCcxtFormat(response ?? {});
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
    

/**
 * Fetches market candles data from exchange
 * @async
 * @param {string} symbol - Trading Pair : BTS-USDT
 * @param {string} interval - Time range : 1m, 2m
 * @returns {Promise<object>} - List of candles data
 * @see https://mexcdevelop.github.io/apidocs/spot_v3_en/#kline-candlestick-data
 */

    static async fetchKlines(symbol, interval){
        try {
            const params = this.buildQueryParams({
                symbol: symbol,
                interval : this.INTERVAL[interval]
            });
            const response = await this.callExchangeAPI(this.endPoints.klines, params);


            if (!response) {
                console.error("Error message from response", response.msg || response.error || "Unknown error");
                const errMgs = response.msg ??  response.error ?? JSON.stringify(response);
                return errMgs;
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
        } catch (error) {
            console.error("Error fetching klines:", error);
            throw error;
        }
    }

}



export default Mexc_Service;