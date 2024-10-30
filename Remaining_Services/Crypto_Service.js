import crypto from "crypto";
import PlaceOrderResultFactory from "../Order_Result/PlaceOrderResultFactory.js";
import UserOrder from "../Models/UserOrder.js";
import FetchOrderResultFactory from "../Order_Result/FetchOrderResultFactory.js";
import CancelOrderResult from "../Order_Result/CancelOrderResult.js";
import { console } from "inspector";

// PENDING AUTH

class Crypto {
  static STATUS_PARTIAL_FILLED = "partial_filled";
  static STATUS_CANCELLED = "cancelled";
  static STATUS_FILLED = "filled";
  static STATUS_ONGOING = "ongoing";

  static STATUS_OPENS_CCXT = ["open", "new", "NEW", "ongoing"];
  static STATUS_CANCELS_CCXT = ["CANCELLED", "cancelled", "CANCELED"];
  static STATUS_FILLED_CCXT = ["FILLED", "filled", "closed", "CLOSED"];

  static STATE_MAP = {
    canceled: Crypto.STATUS_CANCELLED,
    mmp_canceled: Crypto.STATUS_CANCELLED,
    live: Crypto.STATUS_ONGOING,
    partially_filled: Crypto.STATUS_PARTIAL_FILLED,
    filled: Crypto.STATUS_FILLED,
  };

  static getBaseUrl() {
    return "https://api.crypto.com/exchange/v1/";
  }

  static buildQueryParams(params) {
    return params;
  }

            // AUTHENTICATION...
  static async Authentication(endPoint = null, params = {}, method = "GET") {
    const api_key = process.env.API_KEY_Crypto;
    const secret_key = process.env.SECRECT_KEY_Crypto;
    const id = 23243;
    const nonce = Date.now();

    const request = {
      id: id,
      method: endPoint,
      api_key: api_key,
      nonce: nonce,  
      params: params,
    };

    const sortedParams = Object.keys(params).sort();
    const paramString = sortedParams
      .map((key) => `${key}${params[key]}`)
      .join("");

    const sigPayload = `${endPoint}${id}${api_key}${paramString}${nonce}`;

    console.warn("checking :", sigPayload);
    request.sig = crypto
      .createHmac("sha256", secret_key)
      .update(sigPayload)
      .digest("hex");

    const queryString =
      Object.keys(params ?? {}).length === 0
        ? ""
        : "?" +
          Object.keys(params)
            .map(
              (key) =>
                `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`
            )
            .join("&");

    const url = this.getBaseUrl() + endPoint + queryString;

    return {
      url,
      request,
      headers: {
        "Content-Type": "application/json",
      },
    };
  }


  //CALL-EXCHANGE-API
  static async callExchangeAPI(endPoint, params, method = "GET") {
    try {
      const { headers, url, request } = await this.Authentication(
        endPoint,
        params,
        method
      );

      const options = {
        method,
        headers,
        ...(method === "POST" ? { body: JSON.stringify(request) } : {}),
      };

      console.log("Auths:", options);

      const response = await fetch(url, options);
      
      return await response.json();
    } catch (error) {
      console.error("API ERROR:", error);
      throw error;
    }
  }

  // https://exchange-docs.crypto.com/exchange/v1/rest-ws/index.html#private-user-balance
static async fetchBalanceOnExchange() {
    const endPoint = "private/user-balance";
    try {
        const response = await this.callExchangeAPI(endPoint, {}, "POST");

        console.log("Response From Balance API:", response);

        let result = { coins: [] };


        if (Array.isArray(response.result.data)) {
            console.log("Account Data Array:", response.result.data);

            response.result.data.forEach((accountData) => {
                const availBal = parseFloat(accountData.total_available_balance) || 0;
                const usedBal = parseFloat(accountData.total_initial_margin) || 0;
                const totalBal = availBal + usedBal;

                result.coins.push({
                    coin: accountData.instrument_name || "N/A",
                    free: availBal, // Available balance 
                    used: usedBal, // Balance used
                    total: totalBal, // Total balance
                });
            });
        }

        // If no balance then, show default values
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
        console.error("Error Fetching Balance", error);
        throw error;
    }
}



  // https://exchange-docs.crypto.com/exchange/v1/rest-ws/index.html#private-create-order
  static async placeOrderOnExchange(instrument_name, side, type, quantity, price) {
    const endPoint = "private/create-order";
    try {
      const params = this.buildQueryParams({
        instrument_name: instrument_name,
        side: side,
        type: type,
        quantity: quantity,
        price: price,
      });

      const response = await this.callExchangeAPI(endPoint, params, "POST");

      if (!response.id) {
      console.log("Response From Pending Order", response);
        const errMsg =
          response.error ?? response.message ?? JSON.stringify(response);
        return PlaceOrderResultFactory.createFalseResult(errMsg, response);
      }
      console.log("Response From Pending Order", response);

        return await this.createSuccessPlaceOrderResult(response);  
    //   return response;
    } catch (error) {
      console.error("Error Placing An Order", error);
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
        response
      );
      return placeOrderResult;
    } catch (error) {
      console.error("Format Not Successed!", error.message);
      throw error;
    }
  }

  // https://exchange-docs.crypto.com/exchange/v1/rest-ws/index.html#private-get-open-orders
  static async pendingOrders(instrument_name) {
    const endPoint = "private/get-open-orders";
    try {
      const params = this.buildQueryParams({
        instrument_name: instrument_name,
      });
      const response = await this.callExchangeAPI(endPoint, params, "POST");

      console.log("Response From Pending Order", response);

      return response;
    } catch (error) {
      console.error("Error Fetching Pending Order Details", error);
      throw error;
    }
  }

  // https://exchange-docs.crypto.com/exchange/v1/rest-ws/index.html#private-cancel-order
  static async cancelOrderFromExchange(order_id, client_oid = null) {
    const endPoint = "private/cancel-order";
    try {
      const params = this.buildQueryParams({
        order_id: order_id,
        client_oid: client_oid || null
      });

      const response = await this.callExchangeAPI(endPoint, params, "POST");

      if (!response.id) {
        console.log("Response From Pending Order", response);
        const errMsg =
          response.error ?? response.msg ?? JSON.stringify(response);
        return new CancelOrderResult(false, errMsg, response);
      }
        console.log("Response From Pending Order", response);

      return new CancelOrderResult(true, "Success", response);
    } catch (error) {
      console.error("Error Cancelling An Order", error);
      throw error;
    }
  }

  // https://exchange-docs.crypto.com/exchange/v1/rest-ws/index.html#private-get-order-detail
  static async fetchOrderFromExchange(order_id) {
    const endPoint = "private/get-order-detail";
    try {
      const params = this.buildQueryParams({
        order_id: order_id
      });

      const response = await this.callExchangeAPI(endPoint, params, "POST");

      if (!response.id) {
      console.log("Response ", response);

        const failureMsg =
          response?.message ??
          response.message ??
          "Unexpected response format or missing critical fields.";
        return FetchOrderResultFactory.createFalseResult(failureMsg);
        
      }

      console.log("Response ", response);


      return this.createFetchOrderResultFromResponse(response);
      return response;
    } catch (error) {
      console.error("Error Fetching Order Details", error);
      throw error;
    }
  }

  static createFetchOrderResultFromResponse(response) {
    const status =
      response?.result?.status ??
      this.STATE_MAP[response?.result?.status] ??
      UserOrder.STATUS_ONGOING;
    const avg = parseFloat(response?.result?.avg_price) || 0;
    const filled = parseFloat(response?.result?.cumulative_quantity) || 0;

    return FetchOrderResultFactory.createSuccessResult(
      status,
      avg * filled,
      avg,
      parseFloat(response?.result?.cumulative_fee) || 0,
      filled,
      response?.result?.create_time
    );
  }

  //   https://exchange-docs.crypto.com/exchange/v1/rest-ws/index.html#private-get-trades
static async loadTradesForClosedOrder(instrument_name) {
    const endPoint = "private/get-trades";

    try {
        const params = this.buildQueryParams({
            instrument_name: instrument_name,
        });
        const response = await this.callExchangeAPI(endPoint, params, "POST");

        if (response.code !== 0) {
            console.log("Response Is Not OK:", response);
            return [];
        }

        console.log("Response ", response);
        return this.convertTradesToCcxtFormat(response);
    } catch (error) {
        console.error("Error fetching Trades:", error);
        throw error;
    }
}

static async convertTradesToCcxtFormat(trades = {}) {
    try {
        let tradesArray = [];

        // Checks if the trades result has data
        if (Array.isArray(trades.result?.data)) {
            tradesArray = trades.result.data;
        }

        // If there are no trades, return default object
        if (tradesArray.length === 0) {
            return [{
                order: "N/A",
                amount: 0,
                baseQty: 0,
                fee: { currency: "N/A", cost: 0 },
                error: null,
            }];
        } else {
            return tradesArray.map((trade) => ({
                order: trade.trade_id || "N/A",
                amount: parseFloat(trade.traded_price) || 0,
                baseQty: parseFloat(trade.traded_quantity) || 0,
                fee: {
                    currency: trade.fee_instrument_name || "N/A",
                    cost: Math.abs(trade.fees) || 0,
                },
                error: trade.msg || null,
            }));
        }
    } catch (error) {
        console.error("Error converting trades:", error);
        throw error;
    }
}


  // https://exchange-docs.crypto.com/exchange/v1/rest-ws/index.html#public-get-candlestick
  static async fetchKlines(instrument_name, period) {
    const endPoint = "public/get-candlestick";
    try {
      const params = this.buildQueryParams({
        instrument_name: instrument_name,
        period: period,
      });
      const response = await this.callExchangeAPI(endPoint, params, "GET");

      if (response.error) {
        console.error("Response From API", response);
      }

      let klines = response.result.data.map((kline) => ({
        Time: kline.t,
        Open: kline.o,
        High: kline.h,
        Low: kline.l,
        Close: kline.c,
        Volume: kline.v,
      }));
      klines.sort((a, b) => a[0] - b[0]); //Sorted By timestamp

      console.log("Response:", klines);

      return klines;
    } catch (error) {
      console.error("Error Fetching Klines", error);
      throw error;
    }
  }
}

export default Crypto;
