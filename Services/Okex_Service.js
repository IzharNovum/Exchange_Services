import fetch  from 'node-fetch';
import crypto from "crypto";
import UserOrder from "../Models/UserOrder.js";
import PlaceOrderResultFactory from "../Order_Result/PlaceOrderResultFactory.js";
import CancelOrderResult from "../Order_Result/CancelOrderResult.js";
import FetchOrderResultFactory from "../Order_Result/FetchOrderResultFactory.js";
import NonCcxtExchangeService from "../Order_Result/NonCcxtExchangeService.js";
import { response } from 'express';
import sendLog from '../Log_System/sendLogs.js';



class OkexService extends NonCcxtExchangeService{

    static STATUS_PARTIAL_FILLED = "partial_filled";
    static STATUS_CANCELLED = "cancelled";
    static STATUS_FILLED = "filled";
    static STATUS_ONGOING = "ongoing";
  
    static STATUS_OPENS_CCXT = ["open", "new", "NEW", "ongoing"];
    static STATUS_CANCELS_CCXT = ["CANCELLED", "cancelled", "CANCELED"];
    static STATUS_FILLED_CCXT = ["FILLED", "filled", "closed", "CLOSED"];
    
    static STATE_MAP = {
      canceled: OkexService.STATUS_CANCELLED,
      mmp_canceled: OkexService.STATUS_CANCELLED,
      live: OkexService.STATUS_ONGOING,
      partially_filled: OkexService.STATUS_PARTIAL_FILLED,
      filled: OkexService.STATUS_FILLED,
    };

  //https://www.okx.com/docs-v5/en/#public-data-rest-api-get-index-candlesticks
    static BAR_MAPS = {
      "5m": "5m",
      "15m": "15m",
      "30m": "30m",
      "1h": "1H",
      "2h": "2H",
      "4h": "4H",
      "6h": "6H",
      "1d": "1Dutc",
    };


  static getBaseUrl() {
    return "https://www.okx.com";
  }

  

  static buildQueryParams(params) {
    return params;
  }


              //HEADER FOR AUTH....
            static async getCommonHeaders(
              endPoint = null,
              params = null,
              method = "GET"
            ) {
              const now = new Date();
              const ts = now.toISOString().replace(/(\.\d{3})\d+/, "$1");
              const Okex_API_KEY = process.env.Okex_API_KEY;
              const Okex_SECRET_KEY = process.env.Okex_SECRET_KEY;
              const passphrase = process.env.PASSPHRASE_KEY;


                  // console.log("okex_key:", Okex_API_KEY)
                  //  console.log("okex_secret:", Okex_SECRET_KEY)

              let queryString = "";
              let body = "";
              let path = endPoint;

              if (method === "GET") {
                queryString =
                  Object?.keys(params ?? {}).length === 0
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
                path = endPoint + queryString;
              } else {
                body = JSON.stringify(params);
              }

              const signData = `${ts}${method}${path}${body}`;
              const sign = crypto
                .createHmac("sha256", Okex_SECRET_KEY)
                .update(signData)
                .digest("base64");

              return {
                "OK-ACCESS-KEY": Okex_API_KEY,
                "OK-ACCESS-SIGN": sign,
                "OK-ACCESS-TIMESTAMP": ts,
                "OK-ACCESS-PASSPHRASE":passphrase,
                "accept": "application/json",
                "Content-Type": method === "POST" ? "application/json" : undefined,
              };
            }


                    // CALL_EXCHANGE_API
          static async callExchangeApi(endPoint, params, method = "GET", log = false) {
            try {
            const headers = await this.getCommonHeaders(endPoint, params, method);

                //LOGS AN ERROR IF ANY AUTH CREDENTIALS MISSING....
              if(!headers){
                await sendLog("Okex-Service", 'Auth', 'CRITICAL', `${endPoint}`, 'Missing Auth Data!');
              }

            const queryString = new URLSearchParams(params).toString();
            const baseUrl = this.getBaseUrl();
            const url = method === "GET" && queryString ? `${baseUrl}${endPoint}?${queryString}` : `${baseUrl}${endPoint}`;
            method = method.toUpperCase();


              const options = {
                method,
                headers,
                ...(method === "GET" ? {} : { body: JSON.stringify(params) }),  
              };
              console.log(options)
              const response = await fetch(url, options);
              const data = await response.json();
          
              if (!response.ok) {
                console.error('API Error:', data);
                throw new Error(`HTTP error! status: ${response.status}`);
              }
          
              return data;
            } catch (error) {
              //LOGS AN ERROR IF ANY ISSUE WITH API CALL...
              await sendLog("Okex-Service", 'Call-Exchange-API', 'ERROR', `${endPoint}`, `${error.message}`);
              console.error("Error making API call:", error);
              return { error: error.message };
            }
          }




  //https://www.okx.com/docs-v5/en/#trading-account-rest-api-get-balance
static async fetchBalanceFromExchange() {
  const endPoint = "/api/v5/account/balance";
  try {
    const response = await this.callExchangeApi(endPoint, {});

    if (response?.code > 0) {
      const msg = response.data?.[0]?.sMsg ?? response.msg ?? JSON.stringify(response);
      await sendLog("Okex-Service", "Balance-API", "ERROR", `${endPoint}`, `${msg}`);
      throw new Error(msg);
    }

    let result = { coins: [] };

    if (response?.data && Array.isArray(response.data)) {
      response.data.forEach((item) => {
        if (Array.isArray(item.details)) {
          item.details.forEach((coinInfo) => {
            const availBal = parseFloat(coinInfo.availBal);
            const frozenBal = parseFloat(coinInfo.frozenBal);

            if (availBal > 0 || frozenBal > 0) {
              result.coins.push({
                coin: coinInfo.ccy,
                free: availBal,
                used: frozenBal,
                total: availBal + frozenBal,
              });
            }
          });
        }
      });
    }

      //SUCCESS LOG...
    await sendLog("Okex-Service", 'Balance', 'INFO', `${endPoint}`, 'Successfully Fetched Balance!');
    return result;
  } catch (error) {
    //LOGS AN ERROR...
    await sendLog("Okex-Service", 'Balance', 'ERROR', `${endPoint}`, `${error.message}`);
    console.error("Error fetching balance:", error.message);
    throw error;
  }
}

  // https://www.okx.com/docs-v5/en/#order-book-trading-trade-post-place-order
 static async  placeOrderOnExchange() {
  const endPoint = "/api/v5/trade/order";
  try {
    const priceStr = 2.15;
    const params = this.buildQueryParams({
      instId: "BTC-USDT",
      tdMode: "cash",
      side: "buy",
      ordType: "limit",
      px: priceStr,
      sz: "1",
      tgtCcy: "base_ccy",
    });

    const response = await this.callExchangeApi(endPoint, params, "POST");

    if (response.code > "0") {
      const msg = response.data?.[0]?.sMsg ?? response.msg ?? JSON.stringify(response);
      //LOGS AN ERROR...
      await sendLog("Okex-Service", "PlaceOrder-API", "ERROR", `${endPoint}`, `${response.msg}`);
      return PlaceOrderResultFactory.createFalseResult(msg, response);
    }
    const msg = response.data?.[0]?.sMsg ?? response.msg ?? JSON.stringify(response);

    //SUCCESS LOG...
    await sendLog("Okex-Service", "Place Order", "INFO", `${endPoint}`, `${msg}`);
    return this.createSuccessPlaceOrderResult(response); 
  } catch (error) {
    //LOGS AN ERROR...
    await sendLog("Okex-Service", 'Place Order', 'ERROR', `${endPoint}`, `${error.message}` );
    console.error("Error Placing An Order!", error.message);
    throw new error;
  }
}


static createSuccessPlaceOrderResult(response) {
  try {
    const orderId = response.data??[0].ordId;
    const time = new Date(response.inTime);
    const placeOrderResult = PlaceOrderResultFactory.createSuccessResult(
      orderId,
      UserOrder.STATUS_ONGOING,
      time,
      response,
    );
    return placeOrderResult;
  } catch (error) {
    console.error("Not Successed!", error.message);
  }

}

  // https://www.okx.com/docs-v5/en/?shell#order-book-trading-trade-get-order-details
        static async pendingOrders(){
          const endPoint = "/api/v5/trade/orders-pending";
          try {
            const response = await this.callExchangeApi(endPoint, {});

            if(response.code > 0){
              //LOGS AN ERROR...
              await sendLog("Okex-Service", "PendingOrder-API", "ERROR", `${endPoint}`, `${response.msg}`);
              console.warn("Response Is Not OK!", response);
            }

            //SUCCESS LOG...
            await sendLog("Okex-Service", 'Pending Order', 'INFO', `${endPoint}`, 'Successfully Fetched Pending Order!');
            return response;
          } catch (error) {
            //LOGS AN ERROR...
            await sendLog("Okex-Service", 'Pending Order', 'ERROR', `${endPoint}`, `${error.message}`);
            console.error("Error Fetching Order Details", error.message);
            throw new error;
          }
        }

  // https://www.okx.com/docs-v5/en/#order-book-trading-trade-post-cancel-order
   static async cancelOrderFromExchange(orderId, symbol, options = []){
    const endPoint = "/api/v5/trade/cancel-order";
    try {
      symbol = "BTC-USDT";
      orderId = "1756032454621872128"
      const params = this.buildQueryParams({
        instId: symbol,
        ordId: orderId,
      });
  
      const response = await this.callExchangeApi(endPoint, params, "POST");

      if (response?.code > 0) {
        const msg = response.data?.[0]?.sMsg ?? response.msg ?? JSON.stringify(response);
        //LOGS AN ERROR...
        await sendLog("Okex-Service", "CancelOrder-API", "ERROR", `${endPoint}`, `${msg}`);
        return new CancelOrderResult(false, msg, response);
      }
  
      //SUCCESS LOG...
      await sendLog("Okex-Service", "Cancel Order", "INFO", `${endPoint}`, "Order Cancelled!");
      return new CancelOrderResult(true, "Success", response);
    } catch (error) {
      //LOGS AN ERROR...
      await sendLog("Okex-Service", 'Cancel Order', 'ERROR', `${endPoint}`, `${error.message}`);
      console.error("Exchange Is Not Successed!", error.message);
      throw new error;
    }
   }


  //https://www.okx.com/docs-v5/en/#order-book-trading-trade-get-order-details
  static async  fetchOrderFromExchange(orderId) {
    const endPoint = "/api/v5/trade/order";
    try {
      orderId = "1697504465752113152"
      const params = this.buildQueryParams({
        instId: 'BTC-USDT',
        ordId: orderId,
      }); 
      const response = await this.callExchangeApi(endPoint, params, "GET");
      
      if (response?.code > 0) {
        const msg = response.data?.[0]?.sMsg ?? response.msg ?? JSON.stringify(response);
        //LOGS AN ERROR...
        await sendLog("Okex-Service", "FetchOrder-API", "ERROR", `${endPoint}`, `${msg}`);
        return new CancelOrderResult(false, msg, response);
      }

      //SUCCESS LOG...
      await sendLog("Okex-Service", "Fetch Order", "INFO", `${endPoint}`, "Order Fetched Successfully!");
      return this.createFetchOrderResultFromResponse(response);
    } catch (error) {
      //LOGS AN ERROR...
      await sendLog("Okex-Service", 'Fetch Order', 'ERROR', `${endPoint}`, `${error.message}`);
      console.error("Error Fetching Order!", error.message);
      throw new error;
    }
  }

 static async createFetchOrderResultFromResponse(response) {
  const endPoint = "/api/v5/trade/order";
  if (response === null || response.code > 0) {
    const failureMsg =
      response.data?.[0]?.sMsg ?? response.msg ?? JSON.stringify(response);
    //LOGS AN ERROR...
    await sendLog("Okex-Service", "FetchOrder-API", "ERROR", `${endPoint}`, `${failureMsg}`);
    return FetchOrderResultFactory.createFalseResult(failureMsg);
  }

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

  //https://www.okx.com/docs-v5/en/#order-book-trading-trade-get-transaction-details-last-3-days
  static async loadTradesForClosedOrder(orderId = null) {
    const endPoint = "/api/v5/trade/fills";
    try {
      orderId = "1697504465752113152"
      const params = this.buildQueryParams({
        ordId : orderId
      });

      const response = await this.callExchangeApi(endPoint, params);
      // console.log(response);

      if(!response){
        //LOGS AN ERROR...
        await sendLog("Okex-Service", "Trades-API", "ERROR", `${endPoint}`, "No Response!");
        console.warn("Response Is Not OK!", response);
      }

      //SUCCESS LOG...
      await sendLog("Okex-Service", "Trades", "INFO", `${endPoint}`, 'Operation Succesfull!');
      return this.convertTradesToCcxtFormat(response ?? {});
    } catch (error) {
      //LOGS AN ERROR...
      await sendLog("Okex-Service", 'Trades', 'ERROR', `${endPoint}`, `${error.message}`);
      console.error("Error Fetching Trades!", error.message);
      throw new error;
    }
  }

  static convertTradesToCcxtFormat(trades = response) {
    let tradesArray = [];
  

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
  
    return ccxtTrades;
  }
  
  

  //https://www.okx.com/docs-v5/en/#public-data-rest-api-get-index-candlesticks-history
  static async fetchKlines(sinceMs) {
    const endPoint = "/api/v5/market/history-index-candles";
    try {
      const params = {
        instId: 'BTC-USDT',
        bar: '1m',
        // after: sinceMs
      };
  
  
      const response = await this.callExchangeApi(endPoint, params);

      //LOGS AN ERROR...
      if (Array.isArray(response.data) && response.data.length === 0) {
        console.error('Unexpected response format:', response);
        await sendLog("Okex-Service", "Klines-API", "ERROR", `${endPoint}`, "No Klines data found.");
        return; // Exit early if there is no data
      };
  
      let klines = response.data.map(kline => [
        kline[0], // time
        kline[1], // open
        kline[2], // high
        kline[3], // low
        kline[4], // close
        0 // no-volume
      ]);
  
      klines.sort((a, b) => a[0] - b[0]);
  
      //SUCCESS LOG...
      await sendLog("Okex-Service", "Klines", "INFO", `${endPoint}`, 'Operation Succesfull!');
      return klines;
    } catch (error) {
      //LOGS AN ERROR...
      await sendLog("Okex-Service", 'Klines', 'ERROR', `${endPoint}`, `${error.message}`);
      console.error("Error Fetching Kline!", error.message);
      throw error;
    }
  }
  
  

}


export default OkexService; 