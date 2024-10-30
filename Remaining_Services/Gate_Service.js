import crypto from "crypto";
import PlaceOrderResultFactory from "../Order_Result/PlaceOrderResultFactory.js"
import UserOrder from "../Models/UserOrder.js";
import FetchOrderResultFactory from "../Order_Result/FetchOrderResultFactory.js";
import CancelOrderResult from "../Order_Result/CancelOrderResult.js";
import { interval } from "date-fns";



class Gate_Service{


    static STATUS_PARTIAL_FILLED = "partial_filled";
    static STATUS_CANCELLED = "cancelled";
    static STATUS_FILLED = "filled";
    static STATUS_ONGOING = "ongoing";
  
    static STATUS_OPENS_CCXT = ["open", "new", "NEW", "ongoing"];
    static STATUS_CANCELS_CCXT = ["CANCELLED", "cancelled", "CANCELED"];
    static STATUS_FILLED_CCXT = ["FILLED", "filled", "closed", "CLOSED"];
  
    static STATE_MAP = {
      canceled: Gate_Service.STATUS_CANCELLED,
      mmp_canceled: Gate_Service.STATUS_CANCELLED,
      live: Gate_Service.STATUS_ONGOING,
      partially_filled: Gate_Service.STATUS_PARTIAL_FILLED,
      filled: Gate_Service.STATUS_FILLED,
    };


    static getBaseUrl(){
        return "https://api.gateio.ws/api/v4";
    }

    static buildQueryParams(params){
        return params;
    }

    static async Authentication(endPoint = null, params = {}, method = "GET"){
        const apikey = process.env.API_KEY_Gate;
        const secretkey = process.env.SECRECT_KEY_Gate;    
        const uri = this.getBaseUrl();
        const timeStamp = Math.floor(Date.now() / 1000);
        const Signed_endPoint = `/api/v4${endPoint}`;


        let queryString = "";
        let body = "";

        if(method === "GET"){   
            queryString = Object.keys(params ?? {}).length === 0 ? "" : "?" + Object.keys(params).map((key)=> `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`).join("&");
        } else {
            body = JSON.stringify(params);
        }

        const signedBody = crypto.createHash('sha512').update(body ?? '').digest('hex');
        const Pre_Signed = `${method}\n${Signed_endPoint}\n${queryString ?? ""}\n${signedBody}\n${timeStamp}`;
        console.log("presigned:", Pre_Signed);
        const signature = crypto.createHmac('sha512', secretkey).update(Pre_Signed).digest('hex');


        const url = `${uri}${endPoint}${queryString}`;


        return { 
            headers : {
                'KEY': apikey,
                'SIGN': signature,
                'Timestamp': timeStamp,
                // 'Accept': 'application/json'
                'Content-Type': 'application/json'
              },
              url
        }
    }


    static async callExchangeAPI(endPoint, params, method = "GET"){
        try {
            const { headers , url } = await this.Authentication(endPoint, params, method);
            // console.log("Auths:", headers);

            const options = {
                method,
                headers,
                ...(method === 'GET' ? {} : { body: JSON.stringify(params) })
            }

            console.warn("url:", url);

            const fetchData = await fetch(url, options);
            const response = await fetchData.json();


            return response;
        } catch (error) {
            console.error("API Error:", error);
            throw error;
        }
    }


    // https://www.gate.io/docs/developers/apiv4/en/#list-spot-accounts
    static async fetchBalanceOnExchange() {
        const endPoint = "/spot/accounts";
        try {
            const response = await this.callExchangeAPI(endPoint, {});
    
            if (response.code !== 0) {
                console.warn("Response Is Not OK!", response);
            }
    
            let result = { coins: [] };
    
            // Check if the response is an array
            if (Array.isArray(response)) {
                console.log("Account Data Array:", response);
    
                response.forEach((coinInfo) => {
                    let availBal = coinInfo.available ? parseFloat(coinInfo.available) : 0;
                    let frozenBal = coinInfo.locked ? parseFloat(coinInfo.locked) : 0;
    
                    result.coins.push({
                        coin: coinInfo.currency, 
                        free: availBal,
                        used: frozenBal,
                        total: availBal + frozenBal 
                    });
                });
    
                // If no coins were added, shows default values
                if (result.coins.length === 0) {
                    result.coins.push({
                        coin: "N/A",
                        free: 0,
                        used: 0,
                        total: 0,
                    });
                }
            }
    
            return result;
        } catch (error) {
            console.error("Error Fetching Balance:", error);
            throw error;
        }
    }
    

    // https://www.gate.io/docs/developers/apiv4/en/#create-an-order
    static async placeOrderOnExchange(currency_pair, side, amount, price) {
        const endPoint = '/spot/orders';
        try {
            const params = this.buildQueryParams({
                currency_pair: currency_pair,
                side: side,
                amount: amount,
                price: price,
    
            })
          const response = await this.callExchangeAPI(endPoint, params, "POST");
    
          if(!response){
            const msg = response.message?.[0]?.sMsg ?? response.message ?? JSON.stringify(response);
            return PlaceOrderResultFactory.createFalseResult(msg, response);
        }

        return await this.createSuccessPlaceOrderResult(response);
        } catch (error) {
          console.error('Error placing An Order:', error);
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


    // https://www.gate.io/docs/developers/apiv4/en/#list-all-open-orders
      static async pendingOrders(){
        const endPoint = "/spot/open_orders";
        try {
            const response =  await this.callExchangeAPI(endPoint, {});

            if(!response){
                console.warn("Response Is Not OK!", response);
            }

            console.log("Response:", response);

            return response;
        } catch (error) {
            console.error("Error Fetching Orders:", error);
            throw error;
        }
    }



    // https://www.gate.io/docs/developers/apiv4/en/#cancel-a-single-order
    static async cancelOrderFromExchange(order_id) {
        const endPoint = `/spot/orders/${order_id}`;
    
        try {
            // The method for this function is DELETE and API DOC guided to use POST. POST is not working shows an invalid method error so used GET method...
            const response = await this.callExchangeAPI(endPoint, {}, "GET");
    
            if(!response){
                const msg = response.message?.[0]?.sMsg ?? response.message ?? JSON.stringify(response);
                return new CancelOrderResult(false, msg, response);
            }

        return new CancelOrderResult(true, "Success", response);
        } catch (error) {
            console.error("Error Cancelling Orders:", error);
            throw error;
        }
    }
    

    
    // https://www.gate.io/docs/developers/apiv4/en/#get-a-single-order
    static async fetchOrderFromExchange(order_id) { 
        const endPoint = `/spot/orders/${order_id}`;
    
        try {
            const response = await this.callExchangeAPI(endPoint, {}) ;
    
            console.log("Response:", response);
    
            return this.createFetchOrderResultFromResponse(response);
        } catch (error) {
            console.error("Error fetching Order:", error);
            throw error;
        }
    }
    

    static createFetchOrderResultFromResponse(response) {      
        const status = response.status ?? this.STATE_MAP[response.status] ?? UserOrder.STATUS_ONGOING;
        const avg = parseFloat(response.avg_deal_price) || 0;
        const filled = parseFloat(response.filled_amount) || 0;
        const time = response.create_time_ms;


        return FetchOrderResultFactory.createSuccessResult(
          status,        //order status
          avg * filled, // Total cost
          avg,          // Average price
          0,            // No Fee Avail In res
          filled,       // Filled quantity
          time// Time
        );
      }


    // https://www.gate.io/docs/developers/apiv4/en/#list-personal-trading-history
    static async loadTradesForClosedOrder(){
        const endPoint = "/spot/my_trades";

        try {
            const response = await this.callExchangeAPI(endPoint, {});

            if(!response){
                console.log("Response Is Not OK:", response);
            }

            return this.convertTradesToCcxtFormat(response ?? {});
        } catch (error) {
            console.error("Error fetching Trades:", error);
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
                return [{   //Default Response Format
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
                    amount: trade.price || 0,       
                    baseQty: trade.amount || 0,     
                    fee: {
                        currency: trade.fee_currency || "N/A",  
                        cost: Math.abs(trade.fee) || 0,
                    },
                    error: trade.message || null
                }));
    
                return ccxtTrades;
            }
        } catch (error) {
            console.error("Error converting trades:", error);
            throw error;
        }
    }
    


    // https://www.gate.io/docs/developers/apiv4/en/#market-candlesticks
    static async fetchKlines(currency_pair, interval){
        const endPoint = "/spot/candlesticks";

        try {
            const params = this.buildQueryParams({
                currency_pair: currency_pair,
                interval: interval
            })
            const response = await this.callExchangeAPI(endPoint, params);

            if(!response){
                console.log("Response Is Not OK:", response);
            }


            let klines = response.map(kline => [
                kline[0], // time
                kline[5], // open
                kline[3], // high
                kline[4], // low
                kline[2], // close
                0 // no-volume
              ]);
          
              klines.sort((a, b) => a[0] - b[0]); //Sorted By timestamp


            console.log("Response:", klines);

            return klines;
        } catch (error) {
            console.error("Error fetching Trades:", error);
            throw error;
        }
    }


}


export default Gate_Service;
