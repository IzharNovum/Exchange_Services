import crypto from "crypto";
import PlaceOrderResultFactory from "../Order_Result/PlaceOrderResultFactory.js"
import UserOrder from "../Models/UserOrder.js";
import FetchOrderResultFactory from "../Order_Result/FetchOrderResultFactory.js";
import CancelOrderResult from "../Order_Result/CancelOrderResult.js";
import dotenv from "dotenv";
import { response } from "express";

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
            console.warn("API Call Failed!", error.message);
            throw error;
        }
    }

    
    // https://huobiapi.github.io/docs/spot/v1/en/#get-all-accounts-of-the-current-user
    static async accountDetails() {
        try {
            const response = await this.callExchangeAPI("/v1/account/accounts", {});
            // console.log("Full Response:", response);
    
            return response;
        } catch (error) {
            console.error("Error Fetching Account Details:", error.message);
            throw error;
        }
    }

    // https://huobiapi.github.io/docs/spot/v1/en/#get-the-total-valuation-of-platform-assets
    static async accountValue(){
        try {
            const response = await this.callExchangeAPI("/v2/account/valuation", {});
            // console.log("Full Response:", response);

            if (response.success !== true) {
                console.error("Response Is Not OK!", response.message);
                throw new Error(`API Error: ${response.message} (Code: ${response.code})`);
            }

            return response;
        } catch (error) {
            console.error("Error Fetching Balance:", error.message);
            throw error;
        }
    }

    // https://huobiapi.github.io/docs/spot/v1/en/#get-account-balance-of-a-specific-account
    static async fetchBalanceOnExchange() {
        try {
            const accountId = "62926999";
            const response = await this.callExchangeAPI(`/v1/account/accounts/${accountId}/balance`, {});
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
                            hasValidCoin = true;
                        }
                    });

         // If There is no coins or balance available then this is a default...
                if (!hasValidCoin) {
                    result.coins.push({
                        coin: '0',
                        free: 0,
                        used: 0,
                        total: 0,
                    });
                }
        }

            return result;
        } catch (error) {
            console.error("Error Fetching Account Details:", error.message);
            throw error;
        }
    }
    
  
    // https://huobiapi.github.io/docs/spot/v1/en/#place-a-new-order
    static async placeOrderOnExchange(){
        try {
            const params = this.buildQueryParams({
                "account-id" : 62926999,
                symbol: "btcusdt",
                type: "buy-limit",
                amount: "10.1",
                price: "6095.65" 
            });

            const response = await this.callExchangeAPI("/v1/order/orders/place", params, "POST");

            if (response.status !== "0k") {
                const msg =
                  response.data?.[0]?.sMsg ?? response.msg ?? JSON.stringify(response);
                return PlaceOrderResultFactory.createFalseResult(msg, response);
              }

            return this.createSuccessPlaceOrderResult(response);
        } catch (error) {
            console.error("Error Placing An Order", error.message);
        }
    }


    static createSuccessPlaceOrderResult(response) {
        try {
            const STATUS_ONGOING = "ongoing";
            const orderId = response?.data;
            const time = new Date();
            const placeOrderResult = PlaceOrderResultFactory.createSuccessResult(
                orderId,
                STATUS_ONGOING,
                time,
                response,
            );
              return placeOrderResult;
        } catch (error) {
              error("Not Successed!", error.message);
        }
    }

    

    // https://huobiapi.github.io/docs/spot/v1/en/#get-all-open-orders
    static async orderDetails(){
        try {
            const response = await this.callExchangeAPI("/v1/order/openOrders", {});

            if (response.status !== "ok") {
                console.error("Response Is Not OK!", response["err-msg"]);
                throw new Error(`API Error: ${response["err-msg"]}`);
            }

            return response;
        } catch (error) {
            console.error("Error Fetching Order-Details", error.message);
            throw error;
        }
    }

    // https://huobiapi.github.io/docs/spot/v1/en/#submit-cancel-for-an-order
    static async cancelOrderOnExchange(orderID) {
        try {
            orderID = orderID;
            const response = await this.callExchangeAPI(`/v1/order/orders/${orderID}/submitcancel`, {}, "POST");
    
            if (response.status !== "ok") {
                const msg = response.data?.[0]?.sMsg ?? response.msg ?? JSON.stringify(response);
                return new CancelOrderResult(false, msg, response);
            }
    
            return response;
        } catch (error) {
            console.error("Error Canceling the Order", error.message);
            throw error;
        }
    }

    // https://huobiapi.github.io/docs/spot/v1/en/#get-the-order-detail-of-an-order
    static async fetchOrderFromExchange(orderID){
        try {
            orderID = "233948934";
            const response = await this.callExchangeAPI(`/v1/order/orders/${orderID}`, {});    
    
            if (response.status !== "ok") {
                const failureMsg =
                response.data?.[0]?.sMsg ?? response.msg ?? JSON.stringify(response);
              return FetchOrderResultFactory.createFalseResult(failureMsg);
            }
    
            return this.createFetchOrderResultFromResponse(response);
        } catch (error) {
            console.error("Error Fetching the Order", error.message);
            throw error;
        }
    }

    static createFetchOrderResultFromResponse(response) {      
        const status =
          this.STATE_MAP[response.data?.[0]?.state] ?? UserOrder.STATUS_ONGOING;
        const avg = response.data?.[0].avgPx || 0;
        const filled = response.data?.[0].accFillSz || 0;
      
        return FetchOrderResultFactory.createSuccessResult(
          status,
          avg * filled,
          avg,
          response.data?.[0].fee || 0,
          filled,
          new Date(response.data?.[0].cTime || 0).toISOString()
        );
      }


    // https://huobiapi.github.io/docs/spot/v1/en/#search-historical-orders-within-48-hours
    static async loadTradesForClosedOrder() {
        try {
            const response = await this.callExchangeAPI(`/v1/order/history`, {});
    
            if (response.status !== "ok") {
                console.error("Response Is Not OK!", response["err-msg"]);
                throw new Error(`API Error: ${response["err-msg"]} for orderID: ${orderID}`);
            }
            return this.convertTradesToCcxtFormat(response ?? {})
        } catch (error) {
            console.error("Error Loading Details!", error.message);
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
            order: trade.ordId || "N/A",
            amount: trade.fillSz || 0,
            baseQty: trade.fillSz || 0,
            fee: {
                currency: trade.feeCcy || "N/A",
                cost: Math.abs(trade.fee) || 0,
            },
            error: trade.error || null
        }));
        console.log("responsne:", ccxtTrades)
    
        return ccxtTrades;
    }
    
    
    // https://huobiapi.github.io/docs/spot/v1/en/#get-klines-candles
    static async fetchKlines(){
        try {
            const params = this.buildQueryParams({
                symbol : "btcusdt",
                period : "1min",
            });

            const response = await this.callExchangeAPI("/market/history/kline", params);

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
          
              return klines;
        } catch (error) {
            console.error("Error Fetching Klines!", error.message);
            throw error;
        }
    }

}


export default huobiExchange;




huobiExchange.authentication();