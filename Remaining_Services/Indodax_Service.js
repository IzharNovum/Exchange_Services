import crypto from "crypto";
import PlaceOrderResultFactory from "../Order_Result/PlaceOrderResultFactory.js"
import UserOrder from "../Models/UserOrder.js";
import FetchOrderResultFactory from "../Order_Result/FetchOrderResultFactory.js";
import CancelOrderResult from "../Order_Result/CancelOrderResult.js";

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

    static getBaseUrl(){
        return "https://indodax.com/tapi";
    }

    static buildQueryParams(params){
        return params;
    }


    // AUTHENTICATION...
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

    // CALL-EXCHANGE-API...
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



    // NOTE : INDODAX DOCUMENT COMMON URL : "https://indodax.com/downloads/INDODAXCOM-API-DOCUMENTATION.pdf"

    // BALANCE...
    static async fetchBalanceOnExchange(){
        const endPoint = "/getInfo";
        try {
            const response = await this.callExchangeAPI(endPoint, {});
            console.warn("response from api:", response);
        
            let result = { coins: [] };
        

            if (response?.return?.balance) {
                const balance = response.return.balance;
                const balanceHold = response.return.balance_hold;
        

                Object.keys(balance).forEach((asset) => {
                    let availBal = balance[asset] || 0; // Get available balance
                    let frozenBal = balanceHold[asset] || 0; // Get frozen balance
        
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
        
            // If there are no coins or balance available, this shows default balance
            if (result.coins.length === 0) {
                result.coins.push({
                    coin: 0,
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

    // PLACE ORDER...
    static async placeOrderOnExchange(pair, type, price, idr){
        const endPoint = "/trade";
        try {
            const params = this.buildQueryParams({
                pair: pair,
                type: type,
                price: price,
                idr: idr    
            })
            const response = await this.callExchangeAPI(endPoint, params);
            console.log("Response From API:", response);

            if(response.success !== 1){
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

    // PENDING ORDERS / OPEN ORDERS...
    static async pendingOrders(){
        const endPoint = "/openOrders";
        try {
            const response = await this.callExchangeAPI(endPoint, {});

            if(response.success !== 1){
                console.warn("Response Is Not OK", response);
            }
            // console.log("response From API:", response);

            return response;
        } catch (error) {
            console.error("Error Fetching Pending Order");
            throw error;
        }
    }

    // CANCEL ORDER...
    static async cancelOrderFromExchange(pair, order_id, type){
        const endPoint = "/cancelOrder";
        try {
            const params = this.buildQueryParams({
                pair: pair,
                order_id: order_id,
                type: type,
            })
            const response = await this.callExchangeAPI(endPoint, params);
            if(response.success !== 1){
                const errMsg = response.error ?? response.msg ?? JSON.stringify(response);
                return new CancelOrderResult(false, errMsg, response);
            }

            // console.log("Response From API:", response);

            return new CancelOrderResult(true, "Success", response);
        } catch (error) {
            console.error("Error WHile Cancelling Order", error);
            throw error;
        }
    }

    // ORDER DETAILS...
    static async fetchOrderFromExchange(pair, order_id){
        const endPoint = "/getOrder";
        try {
            const params =  this.buildQueryParams({
                pair: pair,
                order_id: order_id
            })
            const response = await this.callExchangeAPI(endPoint, params);
            if(response.success !== 1){
                const errMsg = response.error ?? response.msg ?? JSON.stringify(response);
                return FetchOrderResultFactory.createFalseResult(errMsg);
            };

            // console.log("resposne from API:", response);

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
    

        // TRADES HISTORY
    static async loadTradesForClosedOrder(pair){
        const endPoint = "/tradeHistory";
        try {
            const params = this.buildQueryParams({
                pair: pair
            })
            const response = await this.callExchangeAPI(endPoint, params);
            console.log("resposane from API:", response);

            if(response.success !== 1){
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
    

    // https://github.com/btcid/indodax-official-api-docs/blob/master/Public-RestAPI.md#server-time
    static async fetchKlines(from, to, tf, symbol) {
        const endPoint = "/tradingview/history_v2";
    
        try {
        const uri = "https://indodax.com";
        const params = new URLSearchParams({
            from: from, //dont need to sort the
            to: to,   
            tf: tf,               
            symbol: symbol 
        });

            const url = `${uri}${endPoint}?${params.toString()}`;
            
            const response = await fetch(url);
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
