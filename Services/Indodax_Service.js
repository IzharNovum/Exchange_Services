import crypto from "crypto";
import PlaceOrderResultFactory from "../Order_Result/PlaceOrderResultFactory.js"
import UserOrder from "../Models/UserOrder.js";
import FetchOrderResultFactory from "../Order_Result/FetchOrderResultFactory.js";
import CancelOrderResult from "../Order_Result/CancelOrderResult.js";
import OrderParam from "../Models/OrderParam.js";
import ExchangePair from "../Models/ExchangePair.js";

class Indodax_Services{


    static STATUS_PARTIAL_FILLED = "partial_filled";
    static STATUS_CANCELLED = "cancelled";
    static STATUS_FILLED = "filled";
    static STATUS_ONGOING = "ongoing";
  
    static STATUS_OPENS_CCXT = ["open", "new", "NEW", "ongoing"];
    static STATUS_CANCELS_CCXT = ["CANCELLED", "cancelled", "CANCELED"];
    static STATUS_FILLED_CCXT = ["FILLED", "filled", "closed", "CLOSED"];
  
    static STATE_MAP = {
      canceled: Indodax_Services.STATUS_CANCELLED,
      mmp_canceled: Indodax_Services.STATUS_CANCELLED,
      live: Indodax_Services.STATUS_ONGOING,
      partially_filled: Indodax_Services.STATUS_PARTIAL_FILLED,
      filled: Indodax_Services.STATUS_FILLED,
    };

    static INDO_INTERVALS = {
        "5m": "5",
        "15m": "15",
        "30m": "30",
        "1h": "60",
        "4h": "240",
        "1d": "1D"
      };

      /**
       * Instance of the classes
       */
      static OrderParam =  new OrderParam();
      static ExchangePair = new ExchangePair();

    static getBaseUrl(){
        return "https://indodax.com/tapi";
    }

    static buildQueryParams(params){
        return params;
    }

    static endPoints = {
        Balance : "getInfo",
        Place_Order : "trade",
        Pending_Order : "openOrders",
        Cancel_Order : "cancelOrder",
        Fetch_Order : "getOrder",
        Trades : "tradeHistory",
        klines : "tradingview/history_v2"
      }
    
      static isError(response){
        const HTTP_OK = 1;
        return response.success !== HTTP_OK;
      }
    
    /**
     * Authentication for this API.
     * @async
     * @param {string} endPoint - Url endpoint.
     * @param {string || number} params - Function parameters.  
     * @param {string} method - HTTP Method
     * @returns {Promise<authData>} - Authentication body, headers 
     */

    static async Authentication(endPoint = null, params = {}, method = "POST"){
        const timestamp = Date.now();
        const API_Key = process.env.API_KEY_Indodax;
        const Secret_Key = process.env.SECRECT_KEY_Indodax;
        // console.log("checking ", API_Key, Secret_Key)
        params = {
            method: endPoint.replace('/', ''),
            timestamp,
            ...params
        };

        const body =  Object.keys(params ?? {}).map((key)=> `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`).join("&");

        console.warn("checking", body);


        const sign = crypto.createHmac('sha512', Secret_Key).update(body).digest('hex');
        console.log("signature:", sign);

        return {
            headers: {
                "Key":API_Key,
                "Sign":sign,
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body
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
    static async callExchangeAPI(endPoint, params, method = "POST"){
        try {
            const uri = this.getBaseUrl();
            const {headers, body} = await this.Authentication(endPoint, params, method);


            const options = {
                method,
                headers,
                body
            }

            console.warn("checking", options)
            console.log("url:", uri);

            
            const responseData = await fetch(uri, options);
            const response = await responseData.json(); 


            return response;
        } catch (error) {
            console.error("API Exchange Error:", error);
            throw error;
        }
    }



// NOTE : INDODAX PDF DOCUMENT COMMON URL : "https://indodax.com/downloads/INDODAXCOM-API-DOCUMENTATION.pdf"

/**
 * Fecthes User balance from the exchange.
 * @async
 * @param {string} - Method for the API Call "Like an endPoint".
 * @returns {Promise<{coins: Array}>} - User Balance-data
 * @see  https://indodax.com/downloads/INDODAXCOM-API-DOCUMENTATION.pdf
 */
    static async fetchBalanceOnExchange(){
        try {
            const params = this.buildQueryParams({
                method : this.endPoints.Balance
            })
            const response = await this.callExchangeAPI("", params);

            if (!response) {
                console.error("Error message from response", response.error || "Unknown error");
                throw new Error(response.error || "Unknown error occuried");
              };
              
            console.log("Response:", response);

            let result = { coins: [] };

            // Check if the response has the expected structure
            if (response?.return) {
              const balance = response.return.balance || {};
              const balanceHold = response.return.balance_hold || {};
          
              // Iterate over the assets in the balance object
              Object.keys(balance).forEach((asset) => {
                const availBal = parseFloat(balance[asset]) || 0; // Available balance
                const frozenBal = parseFloat(balanceHold[asset]) || 0; // Frozen balance
          
                // Include the asset only if there's a non-zero balance
                if (availBal > 0 || frozenBal > 0) {
                  result.coins.push({
                    coin: asset,
                    free: availBal,
                    used: frozenBal,
                    total: availBal + frozenBal,
                  });
                }
              });
            }
          
            // If no balances are available, add default values
            if (result.coins.length === 0) {
              result.coins.push({
                coin: "N/A",
                free: 0,
                used: 0,
                total: 0,
              });
            }
          
            console.log("Formatted Result:", result);
            return result;
        } catch (error) {
            console.error("Error fetching balances", error);
        }
        
    }

    /**
     * Places an order from exchange
     * @async
     * @param {string} method - Method for the API Call "Like an endPoint".
     * @param {string} pair - Trading pair : btc_idr
     * @param {string} type - buy / sell
     * @param {number} price - order price
     * @param {number} idr - amount of rupiah to buy btc.
     * @returns {Promise<Object>} - Details of the placed order.
     * @see  https://indodax.com/downloads/INDODAXCOM-API-DOCUMENTATION.pdf
     */
    static async placeOrderOnExchange(ExchangePair, OrderParam, symbol){
        try {
            const params = this.buildQueryParams({
                method : this.endPoints.Place_Order,
                pair: symbol,
                type: OrderParam.getSide(),
                price: OrderParam.getPrice(),
                idr : OrderParam.getIDR(),
                order_type: OrderParam.getType(),
                time_in_force: ExchangePair.getTimeinForce()
            });
      console.log("PARAMETERS:", params)


            const response = await this.callExchangeAPI("", params);
            console.log("Response From API:", response);

            if(this.isError(response)){
                const errMsg = response.error ?? response.msg ?? JSON.stringify(response);
                return PlaceOrderResultFactory.createFalseResult(errMsg, response);
            }

            return await this.createSuccessPlaceOrderResult(response);
        } catch (error) {
            console.error("Error placing An Order:", error);
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
 * Fecthes open or pending orders from the exchange.
 * @async
 * @param {string} method - Method for the API Call "Like an endPoint".
 * @returns {Promise<{object}>} - List of pending orders.
 * @see  https://indodax.com/downloads/INDODAXCOM-API-DOCUMENTATION.pdf
 */
    static async pendingOrders(){
        try {
            const params = this.buildQueryParams({
                method : this.endPoints.Pending_Order
            });

            const response = await this.callExchangeAPI("", params);

            if(this.isError(response)){
                const errMsg = response.error ?? response.msg ?? JSON.stringify(response);
                return errMsg;
            };


            console.log("response From API:", response);

            return response;
        } catch (error) {
            console.error("Error Fetching Pending Order");
            throw error;
        }
    }

    /**
     * Cancels an existing order from exchange
     * @async
     * @param {string} method - Method for the API Call "Like an endPoint".
     * @param {string} pair - Trading pair : btc_idr
     * @param {number} order_id - Order ID
     * @param {string} type - buy / sell
     * @returns {Promise<object>} - Status of Order cancellation
     * @see https://www.gate.io/docs/developers/apiv4/en/#cancel-a-single-order
     */

    static async cancelOrderFromExchange(pair, order_id, type){
        try {
            const params = this.buildQueryParams({
                method : this.endPoints.Cancel_Order,
                pair: pair,
                order_id: order_id,
                type: type,
            })
            const response = await this.callExchangeAPI("", params);

            if(this.isError(response)){
                const errMsg = response.error ?? response.msg ?? JSON.stringify(response);
                return new CancelOrderResult(false, errMsg, response);
            }

            console.log("Response:", response);

            return new CancelOrderResult(true, "Success", response);
        } catch (error) {
            console.error("Error WHile Cancelling Order", error);
            throw error;
        }
    }


    /**
     * Fetches Order details from exchange
     * @async
     * @param {string} method - Method for the API Call "Like an endPoint".
     * @param {string} pair - Trading pair : btc_idr
     * @param {number} order_id - Order ID
     * @returns {Promise<object>} - Order details
     * @see https://www.gate.io/docs/developers/apiv4/en/#cancel-a-single-order
     */

    static async fetchOrderFromExchange(pair, order_id){
        try {
            const params =  this.buildQueryParams({
                method : this.endPoints.Fetch_Order,
                pair: pair,
                order_id: order_id
            })
            const response = await this.callExchangeAPI("", params);

            if(this.isError(response)){
                const errMsg = response.error ?? response.msg ?? JSON.stringify(response);
                return FetchOrderResultFactory.createFalseResult(errMsg);
            };

            console.log("resposne:", response);

            return this.createFetchOrderResultFromResponse(response);
        } catch (error) {
            console.error("Error Fetching Order Details", error);
            throw error;
        }
    }

    static createFetchOrderResultFromResponse(response) {
        const order = response.return.order;
        
        const status = order.status === "open" ? this.STATE_MAP[response.status] : UserOrder.STATUS_COMPLETED;
        
        const avg = parseFloat(order.price) || 0; 
        const filled = parseFloat(order.order_ltc) - parseFloat(order.remain_ltc) || 0; 
        
        return FetchOrderResultFactory.createSuccessResult(
            status,                   // order status
            avg * filled,            // Total cost (avg price * filled quantity)
            avg,                     // Average price
            0,                       // No Fee Available in response
            filled,                  // Filled quantity
            new Date(parseInt(order.submit_time) * 1000).toISOString() // Submit time converted from UNIX timestamp to ISO format
        );
    }
    

    /**
     * Fetches recent trades from exchange
     * @async
     * @param {string} method - Method for the API Call "Like an endPoint".
     * @param {string} pair - Trading pair : btc_idr
     * @returns {Promise<object>} - Order details
     * @see https://github.com/btcid/indodax-official-api-docs/blob/master/Private-RestAPI.md#trade-history-endpoints
     */
    static async loadTradesForClosedOrder(pair){
        try {
            const params = this.buildQueryParams({
                method : this.endPoints.Trades,
                pair: pair
            })
            const response = await this.callExchangeAPI("", params);
            console.log("response:", response);

            if(this.isError(response)){
                const errMsg = response.error ?? response.msg ?? JSON.stringify(response);
                return errMsg;
            };

            return this.convertTradesToCcxtFormat(response ?? {});
        } catch (error) {
            console.error("Error Fetching Trades ", error);
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
    
            const ccxtTrades = [];
    
            tradesArray.forEach(trade => {

                if (trade?.balance && typeof trade.balance === 'object') {

                    Object.entries(trade.balance).forEach(([coin, amount]) => {

                        if (parseFloat(amount) > 0) {
                            ccxtTrades.push({
                                order: trade.order_id || "N/A",  
                                asset: coin,                    
                                amount: parseFloat(amount) || 0, 
                                baseQty: 0,                      
                                fee: {
                                    currency: "N/A",             
                                    cost: 0                     
                                },
                                error: null                     
                            });
                        }
                    });
                } else {
                    // If no 'balance' field exists, add a default trade (optional)
                    ccxtTrades.push({
                        order: trade.orderId || "N/A", 
                        amount: trade.price || 0,     
                        baseQty: trade.qty || 0,          
                        fee: {
                            currency: trade.commissionAsset || "N/A",
                            cost: Math.abs(trade.commission) || 0
                        },
                        error: trade.error || null
                    });
                }
            });
    
            return ccxtTrades;
        } catch (error) {
            console.warn("Error Fetching Order Details!", error.message);
            throw new Error(error.message);
        }
    }
    

    /**
     * Fetches market candle data from exchange
     * @async
     * @param {number} from - beginning of time frame 
     * @param {number} to - end of time frame
     * @param {number} tf - time frame range in minute, day, or week 
     * @param {string} symbol - Trading pair : btc_idr
     * @returns {Promise<object>} - List of market candles.
     * @see https://github.com/btcid/indodax-official-api-docs/blob/master/Public-RestAPI.md#server-time
     */

    static async fetchKlines(from, to, tf, symbol) {    
        try {
        // const from = new Date(from * 1000);
        // const to = new Date(to * 1000);
        const uri = "https://indodax.com/";
        const params = new URLSearchParams({
            from: from,
            to: to,   
            tf: this.INDO_INTERVALS[tf],               
            symbol: symbol 
        });

            const url = `${uri}${this.endPoints.klines}?${params.toString()}`;
            
            const response = await fetch(url);

            if (!response) {
                console.error("Error message from response", response.error || "Unknown error");
                throw new Error(response.error || "Unknown error occuried");
              };

            const data = await response.json(); 
            data.sort((a, b) => a[0] - b[0]); //Sorted By timestamp

            console.log("Response From API:", data);
            return data;
        } catch (error) {
            console.error("Error Fetching Klines", error);
            throw error;
        }
    }
    
}


export default Indodax_Services;
