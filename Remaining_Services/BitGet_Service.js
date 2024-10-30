import crypto from "crypto";
import PlaceOrderResultFactory from "../Order_Result/PlaceOrderResultFactory.js"
import UserOrder from "../Models/UserOrder.js";
import FetchOrderResultFactory from "../Order_Result/FetchOrderResultFactory.js";
import CancelOrderResult from "../Order_Result/CancelOrderResult.js";


class BitGet_Service{


    static STATUS_PARTIAL_FILLED = "partial_filled";
    static STATUS_CANCELLED = "cancelled";
    static STATUS_FILLED = "filled";
    static STATUS_ONGOING = "ongoing";
  
    static STATUS_OPENS_CCXT = ["open", "new", "NEW", "ongoing"];
    static STATUS_CANCELS_CCXT = ["CANCELLED", "cancelled", "CANCELED"];
    static STATUS_FILLED_CCXT = ["FILLED", "filled", "closed", "CLOSED"];
  
    static STATE_MAP = {
      canceled: BitGet_Service.STATUS_CANCELLED,
      mmp_canceled: BitGet_Service.STATUS_CANCELLED,
      live: BitGet_Service.STATUS_ONGOING,
      partially_filled: BitGet_Service.STATUS_PARTIAL_FILLED,
      filled: BitGet_Service.STATUS_FILLED,
    };
    



    static getBaseUrl(){
        return "https://api.bitget.com";
    }

    static buildQueryParams(params){
        return params;
    }


    // Authentication
    static async Authentication(endPoint = null, params = {}, method = "GET"){
        const timeStamp = Date.now().toString();
        console.warn("ts:", timeStamp);
        const uri = this.getBaseUrl();
        const api_key = process.env.API_KEY_Bit;
        const secret_key = process.env.SECRECT_KEY_Bit;
        const passphrase = process.env.PASSPHRASE_KEY_Bit;

        let queryString = "";
        let body = "";

        if(method === "GET"){
            queryString = Object.keys(params ?? {}).length === 0 ? "" : "?" + Object.keys(params).map((key)=> `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`).join("&");
        }else{
            body = JSON.stringify(params);
        }

        // Generating Signature.
        const pre_signed = `${timeStamp}${method}${endPoint}${queryString}${method === "POST" ? body : ""}`;

        console.warn("Pre-Signed:", pre_signed);

        const signature = crypto.createHmac("sha256", secret_key).update(pre_signed).digest("base64");

        const url = `${uri}${endPoint}${queryString}`;

        return {
            headers : {
                "ACCESS-KEY":api_key,
                "ACCESS-SIGN":signature,
                "ACCESS-TIMESTAMP":timeStamp,
                "ACCESS-PASSPHRASE":passphrase,
                "Content-Type":"application/json"
            },
            url
        }
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


    // https://bitgetlimited.github.io/apidoc/en/spot/#get-account-assets
    static async fetchBalanceOnExchange() {
        const endPoint = "/api/v2/spot/account/assets";
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
        } catch (error) {
            console.error("Error fetching balance:", error);
            throw error;
        }
    }
    



       // https://bitgetlimited.github.io/apidoc/en/spot/#place-order
       static async placeOrderOnExchange(symbol, orderType, side, force, price, quantity){
        const endPoint = "/api/v2/spot/trade/place-order";
        try {
            const params =  this.buildQueryParams({
                symbol: symbol,
                orderType: orderType,
                side: side,
                force: force,
                price: price,
                quantity: quantity
            });

            const response = await this.callExchangeAPI(endPoint, params, "POST");

            if (response.code > "00000") {
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

    // https://www.bitget.com/api-doc/spot/trade/Get-Unfilled-Orders
    static async pendingOrders(){
        const endPoint = "/api/v2/spot/trade/unfilled-orders";
        try {
            const response =  await this.callExchangeAPI(endPoint, {});

            if (response.code > "00000") {
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
    

    // https://www.bitget.com/api-doc/spot/trade/Cancel-Order
    static async cancelOrderFromExchange(id, symbol){
        const endPoint = "/api/v2/spot/trade/cancel-order";
        try {
            const params = this.buildQueryParams({
                id: id,
                symbol: symbol
            });
    
            const response = await this.callExchangeAPI(endPoint, params, "POST");
    

            if (response.code > "00000") {
                const errMsg = response[3] ?? JSON.stringify(response);
                return new CancelOrderResult(false, errMsg, response);

            } else {
                console.log("Response is OK:", response);
                return new CancelOrderResult(true, "Success", response);
                // return response
            }
        } catch (error) {
            console.error("Error Cancelling Orders:", error);
            throw error;
        }
    }
    
    // https://www.bitget.com/api-doc/spot/trade/Get-Order-Info
    static async fetchOrderFromExchange(orderId){
        const endPoint = "/api/v2/spot/trade/orderInfo";
        try {
            const params = this.buildQueryParams({
                orderId: orderId
            });

            const response = await this.callExchangeAPI(endPoint, params);

            if (response.code > "00000") {
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
    if (response.data.length === 0) {
        return FetchOrderResultFactory.createFalseResult("No order data available.");
    }
    const data = response.data[0];
    const status = data.state ?? this.STATE_MAP[data.status] ?? UserOrder.STATUS_ONGOING;
    const avg = parseFloat(data.priceAvg) || 0; // Average price
    const filled = parseFloat(data.baseVolume) || 0; // Filled quantity (base volume)
    const totalCost = parseFloat(data.quoteVolume) || avg * filled; // Total cost (quote volume)
    const time = new Date(parseInt(data.cTime)).toISOString(); // Timestamp
    let feeAmount = 0;
    if (data.feeDetail) {
        const feeDetail = JSON.parse(data.feeDetail);
        feeAmount = Math.abs(parseFloat(feeDetail?.BGB?.totalFee)) || 0;
    }

    return FetchOrderResultFactory.createSuccessResult(
        status,     // Order status
        totalCost,  // Total cost
        avg,        // Average price
        feeAmount,  // Fee
        filled,     // Filled quantity
        time        // Time
    );
}

    
    

    // https://www.bitget.com/api-doc/spot/trade/Get-Fills
    static async loadTradesForClosedOrder(symbol){
        const endPoint = "/api/v2/spot/trade/fills";

        try {
            const params = this.buildQueryParams({
                symbol: symbol
            });
            const response = await this.callExchangeAPI(endPoint, params);


            if (response.code > "00000") {
                console.log("Response Is Not OK:", response);
            }

            // console.log("Response Is Not OK:", response);


            return this.convertTradesToCcxtFormat(response ?? {});
            return response;
        } catch (error) {
            console.error("Error fetching Trades:", error);
            throw error;
        }
    }

    static async convertTradesToCcxtFormat(trades = []) {
        try {
            let tradesArray = [];

            if (Array.isArray(trades.data)) {
                tradesArray = trades.data;
            } else if (trades && typeof trades === 'object') {
                tradesArray = [trades.data];
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
                    order: trade.tradeId || "N/A", 
                    amount: parseFloat(trade.priceAvg) || 0,       
                    baseQty: parseFloat(trade.amount) || 0,     
                    fee: {
                        currency: trade.feeDetail?.feeCoin || "N/A",  
                        cost: trade.feeDetail?.totalFee ? Math.abs(parseFloat(trade.feeDetail.totalFee)) : 0
                    },
                    error: trade.msg || null
                }));                
            }
        } catch (error) {
            console.error("Error converting trades:", error);
            throw error;
        }
    }
    


    // https://www.bitget.com/api-doc/spot/market/Get-Candle-Data
    static async fetchKlines(symbol, granularity){
        const endPoint = "/api/v2/spot/market/candles";
        try {
            const params = this.buildQueryParams({
                symbol: symbol,
                granularity : granularity
            });
            const response = await this.callExchangeAPI(endPoint, params);


            if (response.code > "00000") {
                console.log("Response Is Not OK:", response);
            }

            let klines = response.data.map(kline => [
                kline[0], // time
                kline[1], // open
                kline[2], // high
                kline[3], // low
                kline[4], // close
                kline[5], // Trading volume in base currency
                kline[6], // Trading volume in USDT
                kline[7], // Trading volume in quote currency
            ]);
             
              klines.sort((a, b) => a[0] - b[0]); //Sorted By timestamp

            return klines;

            return response;
        } catch (error) {
            console.error("Error fetching klines:", error);
            throw error;
        }
    }

}



export default BitGet_Service;