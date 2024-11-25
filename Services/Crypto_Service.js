import crypto from "crypto";
import PlaceOrderResultFactory from "../Order_Result/PlaceOrderResultFactory.js";
import UserOrder from "../Models/UserOrder.js";
import FetchOrderResultFactory from "../Order_Result/FetchOrderResultFactory.js";
import CancelOrderResult from "../Order_Result/CancelOrderResult.js";
import OrderParam from "../Models/OrderParam.js";
import ExchangePair from "../Models/ExchangePair.js";



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

  static INTERVALS = {
    "5m": "5m",
    "15m": "15m",
    "30m": "30m",
    "1h": "1h",
    "2h": "2h",
    "4h": "4h",
    "6h": "6h",
    "1d": "1d",
  };

  static getBaseUrl() {
    return "https://api.crypto.com/exchange/v1/";
  }

  static buildQueryParams(params) {
    return params;
  }


  static endPoints = {
    Balance : "private/user-balance",
    Place_Order : "private/create-order",
    Pending_Order : "private/get-open-orders",
    Cancel_Order : "private/cancel-order",
    Fetch_Order : "private/get-order-detail",
    Trades : "private/get-trades",
    klines : "public/get-candlestick"
  }

  static isError(response){
    return !response.id;
  }

/**
 * Authentication for this API.
 * @async
 * @param {string} endPoint - Url endpoint.
 * @param {string || number} params - Function parameters.  
 * @param {string} method - HTTP Method
 * @returns {Promise<authData>} - Authentication url, request, and headers 
 */

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

     console.log("request:", request)

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


/**
 * Exchange API Caller function.
 * @async
 * @param {string} endPoint - Url endpoint.
 * @param {string || number} params - Function parameters.  
 * @param {string} method - Function Method
 * @returns {Promise<Object>} - Fetches data from the API.
 */

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
      // return await response
    } catch (error) {
      console.error("API ERROR:", error);
      throw error;
    }
  }

/**
 * Fecthes User balance from the exchange.
 * @async
 * @param {string} account_uuid  account_uuid -  Universal Unique Identifier.
 * @returns {Promise<{coins: Array}>} - User Balance-data
 * @see  https://exchange-docs.crypto.com/exchange/v1/rest-ws/index.html#private-user-balance
 */


static async fetchBalanceOnExchange() {
    try {
        const response = await this.callExchangeAPI(this.endPoints.Balance, {}, "POST");

        console.log("Response From Balance API:", response);

        let result = { coins: [] };


        if (Array.isArray(response?.result?.data)) {
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

/**
 * Places an order from exchange
 * @async
 * @param {string} instrument_name - Trading-Pair : BTCUSD-PERP
 * @param {string} side - BUY / SELL
 * @param {string} type - LIMIT / MARKET
 * @param {string} quantity - Order Quantity
 * @param {string} price - Order Price
 * @returns {Promise<object>} -  Order details in PlaceOrderResultFactory format.
 * @see https://exchange-docs.crypto.com/exchange/v1/rest-ws/index.html#private-create-order
 */

  static async placeOrderOnExchange(ExchangePair, OrderParam) {
    try {
      const symbol = await ExchangePair.getSymbol();
      const params = this.buildQueryParams({
        instrument_name: symbol.toUpperCase(),
        side: await OrderParam.getSide(),
        type: await OrderParam.getType(),
        price: await OrderParam.getPrice(),
        quantity: await OrderParam.getQty()
      });

      const response = await this.callExchangeAPI(this.endPoints.Place_Order, params, "POST");

      if (this.isError(response)) {
      console.log("Response From Place Order", response);
        const errMsg =
          response.error ?? response.message ?? JSON.stringify(response);
        return PlaceOrderResultFactory.createFalseResult(errMsg, response);
      }
      console.log("Response From Place Order", response);

        return await this.createSuccessPlaceOrderResult(response);  
        // return response
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

  /**
   * Fetches Open or Pending order details from exchange
   * @async
   * @param {string} instrument_name - Trading-Pair : BTCUSD-PERP
   * @returns {Promise<object>} - List of open orders
   * @see https://exchange-docs.crypto.com/exchange/v1/rest-ws/index.html#private-get-open-orders
   */

  static async pendingOrders(instrument_name) {
    try {
      const params = this.buildQueryParams({
        instrument_name: instrument_name,
      });
      const response = await this.callExchangeAPI(this.endPoints.Pending_Order, params, "POST");

      if (this.isError(response)) {
        console.error("Error message from response", response.message || "Unknown error");
        throw new Error(response.message || "Unknown error occuried");
      };

      console.log("Response From Pending Order", response);

      return response;
    } catch (error) {
      console.error("Error Fetching Pending Order Details", error);
      throw error;
    }
  }

  /**
   * Cancels an existing order from exchange
   * @async
   * @param {number} order_id - Order ID
   * @param {numbbet || string} client_oid - Client Order ID
   * @returns {Promise<object>} - Status of order cancellation.
   * @see https://exchange-docs.crypto.com/exchange/v1/rest-ws/index.html#private-cancel-order
   */


  static async cancelOrderFromExchange(order_id, client_oid = null) {
    try {
      const params = this.buildQueryParams({
        order_id: order_id,
        client_oid: client_oid
      });

      const response = await this.callExchangeAPI(this.endPoints.Cancel_Order, params, "POST");

      if (this.isError(response)) {
        const errMsg =
          response.error ?? response.message ?? JSON.stringify(response);
        return new CancelOrderResult(false, errMsg, response);
      }
        console.log("Response From Pending Order", response);

      return new CancelOrderResult(true, "Success", response);
    } catch (error) {
      console.error("Error Cancelling An Order", error);
      throw error;
    }
  }

  /**
   * Fetches order details from exchange
   * @async
   * @param {number} order_id - Order ID
   * @returns {Promise<object>} - Order Details.
   * @see https://exchange-docs.crypto.com/exchange/v1/rest-ws/index.html#private-get-order-detail
   */

  static async fetchOrderFromExchange(order_id) {
    try {
      const params = this.buildQueryParams({
        order_id: order_id
      });

      const response = await this.callExchangeAPI(this.endPoints.Fetch_Order, params, "POST");

      if (this.isError(response)) {
        const failureMsg = response?.message ?? "Unexpected response format or missing critical fields.";
        return FetchOrderResultFactory.createFalseResult(failureMsg); 
      }

      console.log("Response ", response);

      return this.createFetchOrderResultFromResponse(response);
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


  /**
   * Fetches recent orders from exchange.
   * @async
   * @param {string} instrument_name - Trading-Pair : BTCUSD-PERP
   * @returns {Promise<object>} - List of trades
   * @see  https://exchange-docs.crypto.com/exchange/v1/rest-ws/index.html#private-get-trades
   */

static async loadTradesForClosedOrder(instrument_name) {
    try {
        const params = this.buildQueryParams({
            instrument_name: instrument_name,
        });
        const response = await this.callExchangeAPI(this.endPoints.Trades, params, "POST");

        // if (this.isError(response)) {
        //   console.error("Error message from response", response.message || "Unknown error");
        //   throw new Error(response.message || "Unknown error occuried");
        // };

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

/**
 * Fetches candles data from exchange
 * @async
 * @param {string} instrument_name - Trading-Pair : BTCUSD-PERP
 * @param {string} period - time period : 1m, 2m
 * @returns  {Promise<object>} - List of Candle Data.
 * @see https://exchange-docs.crypto.com/exchange/v1/rest-ws/index.html#public-get-candlestick
 */

  static async fetchKlines(instrument_name, period) {
    try {
      const params = this.buildQueryParams({
        instrument_name: instrument_name,
        period: this.INTERVALS[period],
      });
      const response = await this.callExchangeAPI(this.endPoints.klines, params, "GET");

      if (!response) {
        console.error("Error message from response", response.message || "Unknown error");
        throw new Error(response.message || "Unknown error occuried");
      };

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
