import crypto from "crypto";
import PlaceOrderResultFactory from "../Order_Result/PlaceOrderResultFactory.js"
import UserOrder from "../Models/UserOrder.js";
import FetchOrderResultFactory from "../Order_Result/FetchOrderResultFactory.js";
import CancelOrderResult from "../Order_Result/CancelOrderResult.js";
import { Balance } from "@coinbase/coinbase-sdk";


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


    static endPoints = {
        Balance : "/api/v2/spot/account/assets",
        Place_Order : "/api/v2/spot/trade/place-order",
        Pending_Order : "/api/v2/spot/trade/unfilled-orders",
        Cancel_Order : "/api/v2/spot/trade/cancel-order",
        Fetch_Order : "/api/v2/spot/trade/orderInfo",
        Trades : "/api/v2/spot/trade/fills",
        klines : "/api/v2/spot/market/candles"
    }


    static isError(response){
        return response.code > "00000";
    }



    /**
     * @async
     * @param {string} endPoint - Endpoint of the url.
     * @param {string || number} params - Functions Paramaters 
     * @param {string} method - HTTP Method
     * @returns {Promise<authData>} - Authentication Headers
     */

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


/**
* Exchange API Caller function. 
* @async
* @param {string} endPoint - Endpoint of the url.
* @param {string || number} params - Functions Paramaters.
* @param {string} method - HTTP Method.
* @returns {Promise<object>} - Fetches data from the API.
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
* Fetches user balance from the exchange
* @async
* @returns {Promise<{coins: Array}>} - User Balance-data.
* @see https://bitgetlimited.github.io/apidoc/en/spot/#get-account-assets
*/

    static async fetchBalanceOnExchange() {
        try {
            const response = await this.callExchangeAPI(this.endPoints.Balance, {});

            if(this.isError(response)){
                console.error("Error message from response:", response.msg || "Unknown error");
                throw new Error(response.msg || "Unknown error occured");
            }
    
            let result = { coins: [] };
    
            // Checks if the response data is an array
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
    


/**
 * Places an order from exchange.
 * @async
 * @param {string} symbol  symbol - BTCUSDT_SPBL
 * @param {string} orderType  orderType - limit
 * @param {string} side  side - buy/sell
 * @param {string} force  force - normal
 * @param {number} price  price - price of order
 * @param {number} quantity quantity - number of order
 * @returns {Promise<Object>} - Order details in PlaceOrderResultFactory format
 * @see https://bitgetlimited.github.io/apidoc/en/spot/#place-order
 */

       static async placeOrderOnExchange(symbol, orderType, side, force, price, quantity){
        try {
            const params =  this.buildQueryParams({
                symbol: symbol,
                orderType: orderType,
                side: side,
                force: force,
                price: price,
                quantity: quantity
            });

            const response = await this.callExchangeAPI(this.endPoints.Place_Order, params, "POST");

            if (this.isError(response)) {
                const errMsg = response.error ?? response.msg ?? JSON.stringify(response);
                return PlaceOrderResultFactory.createFalseResult(errMsg, response);
            }

            console.log("Response:", response);

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
 * Fetches Open Or Pending orders.
 * @async
 * @returns {Promise<object>} - List of Open orders.
 * @see https://www.bitget.com/api-doc/spot/trade/Get-Unfilled-Orders
 */

    static async pendingOrders(){
        try {
            const response =  await this.callExchangeAPI(this.endPoints.Pending_Order, {});

            if(this.isError(response)){
                console.error("Error message from response:", response.msg || "Unknown error");
                throw new Error(response.error || "Unknown error occured");
            }
            console.log("Response:", response)

            return response;
        } catch (error) {
            console.error("Error Fetching Orders:", error);
            throw error;
        }
    }
    

    /**
     * Cancels an order from exchange.
     * @async
     * @param {number} id - Order ID
     * @param {string} symbol  symbol - BTCUSDT_SPBL
     * @returns {Promise<object>} - Status of Order cancellation.
     * @see https://www.bitget.com/api-doc/spot/trade/Cancel-Order
     */

    static async cancelOrderFromExchange(id, symbol){
        try {
            const params = this.buildQueryParams({
                id: id,
                symbol: symbol
            });
    
            const response = await this.callExchangeAPI(this.endPoints.Cancel_Order, params, "POST");
    

            if (this.isError(response)) {
                const errMsg = response.error ?? response.msg ??  response[3] ?? JSON.stringify(response);
                return new CancelOrderResult(false, errMsg, response);
            } 

            console.log("Response is OK:", response);
            return new CancelOrderResult(true, "Success", response);
        } catch (error) {
            console.error("Error Cancelling Orders:", error);
            throw error;
        }
    }
    
    /**
     * Fetches Order Details.
     * @async
     * @param {number} orderId - Order ID.
     * @returns {Promise<Object>} - Order Details.
     * @see https://www.bitget.com/api-doc/spot/trade/Get-Order-Info
     */

    static async fetchOrderFromExchange(orderId){
        try {
            const params = this.buildQueryParams({
                orderId: orderId
            });

            const response = await this.callExchangeAPI(this.endPoints.Fetch_Order, params);

            if (this.isError(response)) {
                    const failureMsg = response?.sMsg ?? response.msg ?? "Unexpected response format or missing critical fields.";
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

    
    /**
     * Fetches recent trades.
     * @async
     * @param {string} symbol  symbol - BTCUSDT_SPBL
     * @returns {Promise<object>} - List of recent Trades.
     * @see https://www.bitget.com/api-doc/spot/trade/Get-Fills
     */

    static async loadTradesForClosedOrder(symbol){
        try {
            const params = this.buildQueryParams({
                symbol: symbol
            });
            const response = await this.callExchangeAPI(this.endPoints.Trades, params);


            if (this.isError(response)) {
                console.error("Error message from exchange:", response.msg || "Unknown error");
                throw new Error(response.msg || "Unknown error occured");
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
    


    /**
     * Fetches Klines data.
     * @async
     * @param {string} symbol symbol - BTCUSDT_SPBL
     * @param {number} granularity - Candlestick line time unit
     * @returns {Promise <Arrayt>} List of candles data.
     * @see https://www.bitget.com/api-doc/spot/market/Get-Candle-Data
     */

    static async fetchKlines(symbol, granularity){
        try {
            const params = this.buildQueryParams({
                symbol: symbol,
                granularity : granularity
            });
            const response = await this.callExchangeAPI(this.endPoints.klines, params);


            if (!response) {
                console.error("Error message from exchange:", response.msg || "Unknown error");
                throw new Error(response.msg || "Unknown error occured");
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
        } catch (error) {
            console.error("Error fetching klines:", error);
            throw error;
        }
    }

}



export default BitGet_Service;