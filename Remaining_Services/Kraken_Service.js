import crypto from "crypto";
import PlaceOrderResultFactory from "../Order_Result/PlaceOrderResultFactory.js"
import UserOrder from "../Models/UserOrder.js";
import FetchOrderResultFactory from "../Order_Result/FetchOrderResultFactory.js";
import CancelOrderResult from "../Order_Result/CancelOrderResult.js";


class Kraken{
 
    static getBaseUrl(){
        return "https://api.kraken.com";
    }

    static buildQueryParams(params){
        return params;
    }

    static async Authentication(endPoint = null, params = {}, method = "GET") {
        const nonce = Date.now().toString();
        const baseUrl = this.getBaseUrl();

        // API Key and Secret Key
        const api_key = "63GiPaFB9DIzVgoPM7uUcoIpQzCQSSC+JWmVAjzJmzmWU4taEfY2RfCd";
        const secret_key ="5O7VOw1FeGRB8pEktE5AGsDh35u95A9xafJxBryxJIUxolaRX11DcvgK38ZU9SS1uLLbsRlR+BPPFiI9XU4lWg==";




        params.nonce = nonce;
        const body = `${method === "POST" ? new URLSearchParams(params).toString() : ""}`;
        console.warn("body:", body);
        const decodedSecret = Buffer.from(secret_key, 'base64');
        const sha256Hash = crypto.createHash('sha256').update(nonce + body).digest();
        const path = `/0/private/${endPoint}`;
        const preSigned = Buffer.concat([Buffer.from(path), sha256Hash]);
        const signature = crypto.createHmac('sha512', decodedSecret)
            .update(preSigned)
            .digest('base64');

            console.log("signature:", signature);

            let queryString = "";
            if (method === "GET") {
                queryString =
                  Object.keys(params ?? {}).length === 0
                    ? ""
                    : "?" +
                      Object.keys(params)
                        .map(
                          (key) =>
                            `${encodeURIComponent(key)}=${encodeURIComponent(
                              params[key]
                            )}`
                        )
                        .join("&");
              }

        const url = `${baseUrl}${path}${method === "GET" ? queryString : ""}`;

        return {
            url,
            headers: {
                "API-Key": api_key,
                "API-Sign": signature,
                "Content-Type": "application/x-www-form-urlencoded",
                "Accept": "application/json"
            },
            body,
            queryString
        };
    }

    static async callExchangeAPI(endPoint, params, method = "GET") {
        try {
            const { headers, url, body, queryString } = await this.Authentication(endPoint, params, method);

            console.log("query", queryString)
            const options = {
                method,
                headers,
                ...(method === "GET" ? {queryString} : { body })
            };

            const response = await fetch(url, options);
            const data = await response.json();

            // Uncomment for debugging
            // console.log("Response Data:", data);
            // if (!data.result) {
            //     console.error("API Error:", data);
            // }

            return data;
        } catch (error) {
            console.error("API Error In Call Exchange:", error);
            throw error;
        }
    }


    // https://docs.kraken.com/api/docs/rest-api/get-account-balance
    static async fetchBalanceOnExchange(){
        const endPoint = "Balance";
        try {
            const response = await this.callExchangeAPI(endPoint, {}, "POST");
            if(!response.result){
                console.error("Response Is Not OK", response);
            }

            console.log("Success Response From API:", response);


            return response;
        } catch (error) {
            console.error("Error Fetching Balance", error);
            throw error;
        }
    }
    

    // https://docs.kraken.com/api/docs/rest-api/add-order
    static async placeOrderOnExchange() {
        const endPoint = "AddOrder";
        try {
            const params = this.buildQueryParams({
                ordertype: "limit",
                type: "buy",
                volume: "1.25",
                pair: "BTCUSDT",
                price: "500000.00",
            });

            const response = await this.callExchangeAPI(endPoint, params, "POST");

            if (!response.result) {
                const errMgs = response.error ?? JSON.stringify(response);
                return PlaceOrderResultFactory.createFalseResult(errMgs, response);
            }

            // console.log("Success Response From API:", response);
            
            return await this.createSuccessPlaceOrderResult(response);
        } catch (error) {
            console.error("Error Placing an order", error);
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

    // https://docs.kraken.com/api/docs/rest-api/get-open-orders
    static async pendingOrders(){
        const endPoint = "OpenOrders";
        try {
            const response = await this.callExchangeAPI(endPoint, {}, "POST");

            if (!response.result) {
                console.error("Response is not OK", response);
            }

            // console.log("Success Response From API:", response);

            return response;
        } catch (error) {
            console.error("Error Fetching Pending Orders", error);
            throw error;
        }
    };

    // https://docs.kraken.com/api/docs/rest-api/cancel-order
    static async cancelOrderFromExchange(){
        const endPoint = "CancelOrder";
        try {
            const params = this.buildQueryParams({
                cl_ord_id: "2398y2934y734", //can remove this if not needed..
                txid: "OU22CG-KLAF2-FWUDD7" //this txtid is the transaction id..
            });

            const response = await this.callExchangeAPI(endPoint, params, "POST");

            if (!response.result) {
                const errMsg = response.msg ?? JSON.stringify(response);
                return new CancelOrderResult(false, errMsg, response);
            }

            // console.log("Success Response From API:", response);

            return new CancelOrderResult(true, "Success", response);
        } catch (error) {
            console.error("Error Cancelling An Order", error);
            throw error;
        }
    };

    // https://docs.kraken.com/api/docs/rest-api/get-orders-info
    static async fetchOrderFromExchange(){
        const endPoint = "QueryOrders";
        try {
            const params = this.buildQueryParams({
                txid: "STMH53C-C54CG-4SO42I, ST4USDQ-ZQBMB-FGET2G", //this is similar to order_id..
            });

            const response = await this.callExchangeAPI(endPoint, params, "POST");

            if (!response.result) {
                const errMgs = response.msg ?? JSON.stringify(response);
                return FetchOrderResultFactory.createFalseResult(errMgs);
            }

            console.log("Success Response From API:", response);

            return this.createFetchOrderResultFromResponse(response);
        } catch (error) {
            console.error("Error Fetching Order Details", error);
            throw error;
        }
    }

    static createFetchOrderResultFromResponse(response) {
        const orderKey = Object.keys(response.result)[0];
        const order = response.result[orderKey];
        const status = order.status ?? this.STATE_MAP[order.status] ?? UserOrder.STATUS_ONGOING;
        const avg = parseFloat(order.cost) / parseFloat(order.vol_exec) || 0;
        const filled = parseFloat(order.vol_exec) || 0; 
        const fee = parseFloat(order.fee) || 0; 
    
        return FetchOrderResultFactory.createSuccessResult(
            status,                     // Order status
            avg * filled,                // Total cost
            avg,                         // Average price
            fee,                         // Fee
            filled,                      // Filled quantity
            new Date(order.closetm * 1000).toISOString()  // Close time
        );
    }
    

    // https://docs.kraken.com/api/docs/rest-api/get-trade-history
    static async loadTradesForClosedOrder(){
        const endPoint = "TradesHistory";
        try {
            const response = await this.callExchangeAPI(endPoint, {}, "POST");

            if (!response.result) {
                const errMgs = response.msg ?? JSON.stringify(response);
                return errMgs;
            }

            // console.log("Success Response From API:", response);

        return this.convertTradesToCcxtFormat(response ?? {});
        } catch (error) {
            console.error("Error Fetching Trades", error);
            throw error;
        }
    }

    static async convertTradesToCcxtFormat(trades = response) {
        try {
            let tradesArray = "";
    
            if (Array.isArray(trades)) {
                tradesArray = trades;
            } else if (trades && typeof trades === 'object') {
                tradesArray = [trades];
            }
    
            // Default value if no trades
            if (!tradesArray[0]?.result || !tradesArray[0]?.result?.trades || Object.keys(tradesArray[0].result.trades).length === 0) {
                return [{
                    trade_id: "N/A",
                    order: "N/A",
                    amount: 0,
                    baseQty: 0,
                    fee: {
                        currency: "N/A",
                        cost: 0
                    },
                    error: null
                }];
            }
    
            const ccxtTrades = Object.entries(tradesArray[0].result.trades).map(([key, trade]) => {
                return {
                    trade_id: key,
                    order: trade.ordertxid || "N/A",
                    amount: trade.price || 0,
                    baseQty: trade.vol || 0,  // Used 'vol' for quantity
                    fee: {
                        currency: "N/A",  // No 'commissionAsset' in response
                        cost: 0           // No 'commission' in response
                    },
                    error: trade.error || null
                };
            });
    
            return ccxtTrades;
        } catch (error) {
            console.warn("Error Fetching Order Details!", error.message);
            throw error;
        }
    }
    
    
    

    // https://docs.kraken.com/api/docs/rest-api/get-ohlc-data
    // static async fetchKlines() {
    //     const url = "https://api.kraken.com/0/public/OHLC";
    //     try {
    //         const params = new URLSearchParams({
    //             pair: "BTCUSDT",
    //             interval: 1
    //         });
    
    //         // Append the query string to the URL
    //         const fullUrl = `${url}?${params.toString()}`;
            
    //         const data = await fetch(fullUrl);
    //         const response = await data.json();

    //         if (!response.result || !Array.isArray(response.result)) {
    //             const errMgs = response.msg ?? JSON.stringify(response);
    //             return errMgs;
    //         }
            
    //         // console.log("Success Response From API:", response);

    //         const formattedKlines = response.result.XBTUSDT.map(kline => {
    //         return {
    //         time: kline[0],
    //         open: kline[1],
    //         high: kline[2],
    //         low: kline[3],
    //         close: kline[4],
    //         volume: kline[5] // Assuming volume is at index 5
    //         };
    //         });
                
    //         formattedKlines.sort((a, b) => a.time - b.time); // Sorted By timestamp
            
    //         return formattedKlines;
    //     } catch (error) {
    //         console.error("Error Fetching Klines", error);
    //         throw error;
    //     }
    // }
    static async fetchKlines() {
        const url = "https://api.kraken.com/0/public/OHLC";

        try {
            const params = new URLSearchParams({
                pair: "BTCUSDT",
                interval: 1
            });

            const fullUrl = `${url}?${params.toString()}`;
            

            const data = await fetch(fullUrl);
            const response = await data.json();

            // Checks if the response is valid
            if (!response.result || !Array.isArray(response.result.XBTUSDT)) {
                const errMsg = response.msg ?? JSON.stringify(response);
                return errMsg;
            }

            // Format the Klines data
            const formattedKlines = response.result.XBTUSDT.map(kline => {
                return {
                    time: kline[0],
                    open: kline[1],
                    high: kline[2],
                    low: kline[3],
                    close: kline[4],
                    volume: kline[5]
                };
            });

            // Sort Klines by timestamp
            formattedKlines.sort((a, b) => a.time - b.time);
            
            return formattedKlines;
        } catch (error) {
            console.error("Error Fetching Klines", error);
            throw error;
        }
    }
    

}

export default Kraken;