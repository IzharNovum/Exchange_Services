import fetch  from 'node-fetch';
import crypto from "crypto";
import UserOrder from "./Models/UserOrder.js";
import PlaceOrderResultFactory from "./PlaceOrderResultFactory.js";
import CancelOrderResult from "./CancelOrderResult.js";
import FetchOrderResultFactory from "./FetchOrderResultFactory.js";
import OrderParam from "./Models/OrderParam.js";
import NonCcxtExchangeService from "./NonCcxtExchangeService.js";




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


  static async getCommonHeaders(
    endPoint = null,
    params = null,
    method = "GET"
  ) {
    const now = new Date();
    const ts = now.toISOString().replace(/(\.\d{3})\d+/, "$1");
    const apiKey = process.env.API_KEY;
    const secret = process.env.SECRET_KEY;
    const passphrase = process.env.PASSPHRASE_KEY;

    let queryString = "";
    let body = "";
    let path = endPoint;

    if (method === "GET") {
     const queryString =
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
      .createHmac("sha256", secret)
      .update(signData)
      .digest("base64");

    return {
      "OK-ACCESS-KEY": apiKey,
      "OK-ACCESS-SIGN": sign,
      "OK-ACCESS-TIMESTAMP": ts,
      "OK-ACCESS-PASSPHRASE":passphrase,
      "accept": "application/json",
    };
  }

  // CALL_EXCHANGE_API
  static async callExchangeApi(endPoint, params, method = "GET", log = false) {
    const headers = await this.getCommonHeaders(endPoint, params, method);
    const url = this.getBaseUrl() + endPoint;
    method = method.toUpperCase();

    try {
      const options = {
        method,
        headers,
        ...(method === "GET" ? {} : { body: JSON.stringify(params) }),
      };
      const response = await fetch(url, options);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error("Error making API call:", error);
      return { error: error.message };
    }
  }



  //https://www.okx.com/docs-v5/en/#trading-account-rest-api-get-balance
static async fetchBalanceFromExchange() {
    try {
          await this.callExchangeApi("/api/v5/account/balance", []).then((response)=>{
          if (response?.code > 0) {
            const msg = response.data?.[0]?.sMsg ?? response.msg ?? JSON.stringify(response);
            throw new Error(msg);
        }
          return response;
        }).then((data) => {
             if (data && data.data && data.data[0] && data.data[0].details) {
                            console.log("Details:", data.data[0].details);
                        }

          let result = { coins: [] };
      
          if (Array.isArray(data)) {
            data.forEach((coinInfo) => {
                if (coinInfo.availBal > 0 || coinInfo.frozenBal > 0) {
                    result.coins.push({
                        coin: coinInfo.ccy,
                        free: coinInfo.availBal,
                        used: coinInfo.frozenBal,
                        total: parseFloat(coinInfo.availBal) + parseFloat(coinInfo.frozenBal),
                    });
                }
            });
        }
      })
      
    } catch (error) {
        console.error("Error:", error.message);
        throw error;
    }
  
}


  // https://www.okx.com/docs-v5/en/#order-book-trading-trade-post-place-order
  static async placeOrderOnExchage(){
    try {
      const symbol = 'BTC-USDT';
      const priceStr = 2.15;
      const params = this.buildQueryParams({
        instId: symbol,
        tdMode: "cash",
        side: "buy",
        ordType: "limit",
        px: priceStr,
        sz: "2",
        tgtCcy: "base_ccy",
      });


      const data = await this.callExchangeApi("/api/v5/trade/order", params, "POST");
      const response = await data;

      if (response.code > 0) {
        const msg =
          response.data?.[0]?.sMsg ?? response.msg ?? JSON.stringify(response);
        return PlaceOrderResultFactory.createFalseResult(msg, response);
      }
          
      return  this.createSuccessPlaceOrderResult(response); 
    } catch (error) {
      console.error("Error Placing An Order!", error);
    }
  }

  static createSuccessPlaceOrderResult(apiResponse) {
    try {
      const orderId = apiResponse.data??[0].ordId;
      const time = new Date(apiResponse.inTime);
      const placeOrderResult = PlaceOrderResultFactory.createSuccessResult(
        orderId,
        UserOrder.STATUS_ONGOING,
        time,
        apiResponse,
      );
      return placeOrderResult;
    
    } catch (error) {
      error("Not Successed!", error.message);
    }

  }

  // https://www.okx.com/docs-v5/en/#order-book-trading-trade-post-cancel-order
   static async cancelOrderFromExchange(orderId, symbol, options = []){
    try {
       symbol = "BTC-USDT";
      const params = this.buildQueryParams({
        instId: symbol,
        ordId: orderId,
      });

      const data = await this.callExchangeApi("/api/v5/trade/cancel-order", params, "POST");
      const response = await data;
      if(!response){
        console.error("iuzhar")
      }
      if(response?.code > 0){
        const msg = response.data?.[0]?.sMsg ?? response.msg ?? JSON.stringify(response);
        return new CancelOrderResult(false, msg, response);
      }
      
      return new CancelOrderResult(true, "success", response);
    } catch (error) {
      console.error("Exchange Is Not Successed!", error);
    }
   }


  //https://www.okx.com/docs-v5/en/#order-book-trading-trade-get-order-details
  static async fetchOrderFromExchange(orderId) {
    try {
      const params = this.buildQueryParams({
        instId: 'BTC-USDT',
        ordId: orderId,
      });
      const data = await this.callExchangeApi("/api/v5/trade/order", params, "POST");
      const response = await data;
      if(!response){
        console.error("No Response From Fetch!")
      }
      return this.createFetchOrderResultFromResponse(response);
    } catch (error) {
      console.error("Error Fetching Order!", error.message);
    }

  }
  static createFetchOrderResultFromResponse(response) {
    if (response === null || response.code > 0) {
      const failureMsg =
        response.data?.[0]?.sMsg ?? response.msg ?? JSON.stringify(response);
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
      try {
        const params = this.buildQueryParams({
          ordId: orderId,
        });
        console.log(params)
        const data = await this.callExchangeApi( "/api/v5/trade/fills", params);
        const response = await data;

        return this.convertTradesToCcxtFormat(response ?? []);
    } catch (error) {
      console.error(error, `${this.constructor.name} loadTradesForClosedOrder ${error.message}`);
      throw error;
    }
  }


  static convertTradesToCcxtFormat(trades) {
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
      }
    }));
  
    return ccxtTrades;
  }
  
  

  //https://www.okx.com/docs-v5/en/#public-data-rest-api-get-index-candlesticks-history
  static async fetchKlines() {
    try {
      const params = this.buildQueryParams({
        instId: 'BTC-USDT',
        bar: "1h",
        after: "22334",
      });

      const data = await this.callExchangeApi("/api/v5/market/history-index-candles", params);
      const response = await data;

      let klines;

      console.log('API Response:', response);


      if (Array.isArray(response)) {
        klines = response;
    } else if (response && typeof response === 'object') {
        klines = response.data || [response];
    } else {
        throw new Error('Invalid data format');
    }


      klines = klines.map(kline => [
        kline[0], // time
        kline[1], // open
        kline[2], // high
        kline[3], // low
        kline[4], // close
        0 // no-volume
      ]);
  
      klines.sort((a, b) => a[0] - b[0]);
  
      return klines;
    } catch (error) {
      console.error("Error Fetching Kline!", error.message);
    }

  }


}


export default OkexService; 






