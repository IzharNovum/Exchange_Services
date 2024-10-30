import crypto from "crypto";
import PlaceOrderResultFactory from "../Order_Result/PlaceOrderResultFactory.js"
import UserOrder from "../Models/UserOrder.js";
import FetchOrderResultFactory from "../Order_Result/FetchOrderResultFactory.js";
import CancelOrderResult from "../Order_Result/CancelOrderResult.js";


class BitFinex_Service{


    static STATUS_PARTIAL_FILLED = "partial_filled";
    static STATUS_CANCELLED = "cancelled";
    static STATUS_FILLED = "filled";
    static STATUS_ONGOING = "ongoing";
  
    static STATUS_OPENS_CCXT = ["open", "new", "NEW", "ongoing"];
    static STATUS_CANCELS_CCXT = ["CANCELLED", "cancelled", "CANCELED"];
    static STATUS_FILLED_CCXT = ["FILLED", "filled", "closed", "CLOSED"];
  
    static STATE_MAP = {
      canceled: BitFinex_Service.STATUS_CANCELLED,
      mmp_canceled: BitFinex_Service.STATUS_CANCELLED,
      live: BitFinex_Service.STATUS_ONGOING,
      partially_filled: BitFinex_Service.STATUS_PARTIAL_FILLED,
      filled: BitFinex_Service.STATUS_FILLED,
    };


    static getBaseUrl(){
        return "https://api.bitfinex.com/";
    }

    static buildQueryParams(params){
        return params;
    }


    static async Authentication(endPoint = null, params = {}, method = "POST") {
    const uri = this.getBaseUrl();
    const apiKey=process.env.API_KEY_Bit;
    const apiSecret=process.env.SECRECT_KEY_Bit;
    const nonce = Date.now().toString();

    const body = method === 'GET' ? '' : JSON.stringify(params); 
    const signaturePayload = `/api/${endPoint}${nonce}${body}`;
    
    const signature = crypto.createHmac('sha384', apiSecret)
        .update(signaturePayload).digest('hex');
    
        console.warn("stuffs:", apiKey, signature, nonce)

    const url = `${uri}${endPoint}`;

    return {
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'bfx-nonce': nonce,
            'bfx-apikey': apiKey,
            'bfx-signature': signature
        },
        url,
    };
}

static async callExchangeAPI(endPoint, params, method = "POST") {
    try {
        const { headers, url } = await this.Authentication(endPoint, params, method);

        const options = {
            method,
            headers,
            ...(method === 'GET' ? {} : { body: JSON.stringify(params) })
        };
        
        console.log("URL:", url);
        console.log("Options:", options);
        

        const fetchdata = await fetch(url, options);
        const response = await fetchdata.json();

        return response;
    } catch (error) {
        console.error("API Error:", error);
        throw error;
    }
}




    // https://docs.bitfinex.com/reference/rest-auth-wallets
    static async fetchBalanceOnExchange(){
        const endPoint = "v2/auth/r/wallets";
        try {
            const response = await this.callExchangeAPI(endPoint, {});

            if(response[0] === "error"){
                console.log("Error Message From Response:", response.error);
              }

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
        } catch (error) {
            console.error("Error Fetching balance:", error);
            throw error;
        }
    };

    


    // https://docs.bitfinex.com/reference/rest-auth-submit-order
    static async placeOrderOnExchange(symbol, type, price, amount){
        const endPoint = "v2/auth/w/order/submit";
        try {
            const params =  this.buildQueryParams({
                symbol: symbol,
                type: type,
                price: price,
                amount: amount
            });

            const response = await this.callExchangeAPI(endPoint, params);

            if (response[0] === "error") {
                // console.log("Response Is Not OK:", response);
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

    // https://docs.bitfinex.com/reference/rest-auth-retrieve-orders
    static async pendingOrders(){
        const endPoint = "v2/auth/r/orders";
        try {
            const response =  await this.callExchangeAPI(endPoint, {});

            if (response[0] === "error") {
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
    

    // https://docs.bitfinex.com/reference/rest-auth-cancel-order
    static async cancelOrderFromExchange(id){
        const endPoint = "v2/auth/w/order/cancel";
        try {
            const params = this.buildQueryParams({
                id: id
            });

            const response = await this.callExchangeAPI(endPoint, params);
    

            if (response[0] === "error") {
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
    
    // https://docs.bitfinex.com/reference/rest-auth-update-order
    static async fetchOrderFromExchange(id){
        const endPoint = "v2/auth/w/order/update";
        try {
            const params = this.buildQueryParams({
                id: id
            });

            const response = await this.callExchangeAPI(endPoint, params);

            if (response[0] === "error") {
                const failureMsg =
                response?.sMsg ?? response.msg ?? "Unexpected response format or missing critical fields.";
              return FetchOrderResultFactory.createFalseResult(failureMsg);
            }

            return this.createFetchOrderResultFromResponse(response);
        } catch (error) {
            console.error("Error fetching Order:", error);
            throw error;
        }
    }

    static createFetchOrderResultFromResponse(response) {      
        if (response.code > "200") {
            return FetchOrderResultFactory.createFalseResult("No order data available.");
        }
        const status = response.data.status ?? this.STATE_MAP[response.data.status] ?? UserOrder.STATUS_ONGOING;
        const avg = parseFloat(response.data.PRICE_AVG) || 0;
        const filled = parseFloat(response.data.AMOUNT_ORIG) || 0;
        const time = response.data.MTS_CREATE;
      
        return FetchOrderResultFactory.createSuccessResult(
          status,        //order status
          avg * filled, // Total cost
          avg,          // Average price
          0,            // No Fee Avail In res
          filled,       // Filled quantity
          time// Time
        );
      }
    

    // https://docs.bitfinex.com/reference/rest-auth-trades
    static async loadTradesForClosedOrder(){
        const endPoint = "v2/auth/r/trades/hist";

        try {
            const response = await this.callExchangeAPI(endPoint, {});


            if (response[0] === "error") {
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
                    order: trade.ORDER_ID || "N/A", 
                    amount: trade.ORDER_PRICE || 0,       
                    baseQty: trade.EXEC_AMOUNT || 0,     
                    fee: {
                        currency: trade.FEE_CURRENCY || "N/A",  
                        cost: Math.abs(trade.FEE) || 0,
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


    // https://docs.bitfinex.com/reference/rest-public-candles
    static async fetchKlines(candle, section){
        const endPoint = `/v2/candles/${candle}/${section}`;

        try {
            const options = {method: 'GET', headers: {accept: 'application/json'}};
            const uri_pub = "https://api-pub.bitfinex.com";
            const url = `${uri_pub}${endPoint}`;
            const data = await fetch(url, options);
            const response = await data.json();

            if (response[0] === "error") {
                console.log("Response Is Not OK:", response);
            }

            let klines = response.map(kline => [
                kline[0], // time (timestamp)
                kline[5], // open
                kline[4], // high
                kline[3], // low
                kline[2], // close
                kline[1]  // volume
            ]);
            
            klines.sort((a, b) => a[0] - b[0]); // Sort by timestamp


            console.log("Response:", klines);

            return klines;
        } catch (error) {
            console.error("Error fetching klines:", error);
            throw error;
        }
    }






}


// BitFinex_Service.fetchBalanceOnExchange();
export default BitFinex_Service;