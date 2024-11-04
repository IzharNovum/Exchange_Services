import crypto from "crypto";
import PlaceOrderResultFactory from "../Order_Result/PlaceOrderResultFactory.js";
import UserOrder from "../Models/UserOrder.js";
import FetchOrderResultFactory from "../Order_Result/FetchOrderResultFactory.js";
import CancelOrderResult from "../Order_Result/CancelOrderResult.js";

class BitFinex_Service {
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

  static getBaseUrl() {
    return "https://api.bitfinex.com/";
  }

  static buildQueryParams(params) {
    return params;
  }

  static endPoints = {
    Balance: "v2/auth/r/wallets",
    Place_Order: "v2/auth/w/order/submit",
    Pending_Order: "v2/auth/r/orders",
    Cancel_Order: "v2/auth/w/order/cancel",
    Fetch_Order: "v2/auth/w/order/update",
    Trades: "v2/auth/r/trades/hist",
  };

  static isError(response) {
    return response[0] === "error";
  }

  /**
   * Authentication for this API.
   * @async
   * @param {string} endPoint - Url endpoint.
   * @param {string || number} params - Function parameters.
   * @param {string} method - HTTP Method
   * @returns {Promise<authData>} - Authentication Headers
   */

  static async Authentication(endPoint = null, params = {}, method = "POST") {
    const uri = this.getBaseUrl();
    const apiKey = process.env.API_KEY_Bit;
    const apiSecret = process.env.SECRECT_KEY_Bit;
    const nonce = Date.now().toString();

    const body = method === "GET" ? "" : JSON.stringify(params);
    const signaturePayload = `/api/${endPoint}${nonce}${body}`;

    const signature = crypto
      .createHmac("sha384", apiSecret)
      .update(signaturePayload)
      .digest("hex");

    console.warn("stuffs:", apiKey, signature, nonce);

    const url = `${uri}${endPoint}`;

    return {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "bfx-nonce": nonce,
        "bfx-apikey": apiKey,
        "bfx-signature": signature,
      },
      url,
    };
  }

  /**
   * Exchange API Caller function.
   * @async
   * @param {string} endPoint - Url endpoint.
   * @param {string || number} params - Function parameters.
   * @param {string} method - Function Method
   * @returns {Promise<Object>} -  Fetches data from the API.
   */
  static async callExchangeAPI(endPoint, params, method = "POST") {
    try {
      const { headers, url } = await this.Authentication(
        endPoint,
        params,
        method
      );

      const options = {
        method,
        headers,
        ...(method === "GET" ? {} : { body: JSON.stringify(params) }),
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

  /**
   * Fetches user balance from the exchange
   * @async
   * @returns {Promise<{coins: Array}>}    User-Balance data.
   * @see https://docs.bitfinex.com/reference/rest-auth-wallets
   */

  static async fetchBalanceOnExchange() {
    try {
      const response = await this.callExchangeAPI(this.endPoints.Balance, {});

      if (this.isError(response)) {
        console.error(
          "Error Message From Response:",
          response.error || "Unknown error"
        );
        throw new Error(response.error || "An Unknown error occured");
      }

      let result = { coins: [] };

      // Check if the response data is an array
      if (Array.isArray(response)) {
        console.log("Account Data Array:", response);

        response.forEach((coinInfo) => {
          let availBal = parseFloat(coinInfo.AVAILABLE_BALANCE) || 0;
          let frozenBal =
            parseFloat(coinInfo.BALANCE || 0) -
            parseFloat(coinInfo.AVAILABLE_BALANCE || 0);
          let total = parseFloat(coinInfo.BALANCE) || 0;

          result.coins.push({
            coin: coinInfo.CURRENCY || "N/A",
            free: availBal,
            used: frozenBal,
            total: total,
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
  }

  /**
   * Places an order from exchange
   * @async
   * @param {string} symbol symbol - BTC-USDT
   * @param {string} type type - BUY, LIMIT
   * @param {number} price Price - Price of the order
   * @param {number} amount amount - amount of the order
   * @returns {Promise<Object>} - Order details in PlaceOrderResultFactory format
   * @see https://docs.bitfinex.com/reference/rest-auth-submit-order
   */

  static async placeOrderOnExchange(symbol, type, price, amount) {
    try {
      const params = this.buildQueryParams({
        symbol: symbol,
        type: type,
        price: price,
        amount: amount,
      });

      const response = await this.callExchangeAPI(
        this.endPoints.Place_Order,
        params
      );

      if (this.isError(response)) {
        const errMsg =
          response.error ?? response.msg ?? JSON.stringify(response);
        return PlaceOrderResultFactory.createFalseResult(errMsg, response);
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
        response
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
   * @returns {Promise<Array>} List of open orders with order details.
   * @see https://docs.bitfinex.com/reference/rest-auth-retrieve-orders
   */
  static async pendingOrders() {
    try {
      const response = await this.callExchangeAPI(
        this.endPoints.Pending_Order,
        {}
      );

      if (this.isError(response)) {
        console.error(
          "Error Message from response:",
          response.error || "Unknown error"
        );
        throw new Error(response.error || "An unknown error occured");
      }

      console.log("Response:", response);

      return response;
    } catch (error) {
      console.error("Error Fetching Orders:", error);
      throw error;
    }
  }

  /**
   * Cancels an existing order from exchange.
   * @async
   * @param {number} id -  Order ID.
   * @returns {Promise<object>} - Status of order cancellation.
   * @see https://docs.bitfinex.com/reference/rest-auth-cancel-order
   */

  static async cancelOrderFromExchange(id) {
    try {
      const params = this.buildQueryParams({
        id: id,
      });

      const response = await this.callExchangeAPI(
        this.endPoints.Cancel_Order,
        params
      );

      if (this.isError(response)) {
        const errMsg =
          response.error ?? response[3] ?? JSON.stringify(response);
        return new CancelOrderResult(false, errMsg, response);
      }

      console.log("Response:", response);
      return new CancelOrderResult(true, "Success", response);
    } catch (error) {
      console.error("Error Cancelling Orders:", error);
      throw error;
    }
  }

  /**
   * Fetches Order details from exchange.
   * @async
   * @param {number} id  -   Order ID.
   * @returns {Promise<object>} -  Order Details.
   * @see   https://docs.bitfinex.com/reference/rest-auth-update-order
   */

  static async fetchOrderFromExchange(id) {
    try {
      const params = this.buildQueryParams({
        id: id,
      });

      const response = await this.callExchangeAPI(
        this.endPoints.Fetch_Order,
        params
      );

      if (this.isError(response)) {
        const failureMsg =
          response?.sMsg ??
          response.msg ??
          "Unexpected response format or missing critical fields.";
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
      return FetchOrderResultFactory.createFalseResult(
        "No order data available."
      );
    }
    const status =
      response.data.status ??
      this.STATE_MAP[response.data.status] ??
      UserOrder.STATUS_ONGOING;
    const avg = parseFloat(response.data.PRICE_AVG) || 0;
    const filled = parseFloat(response.data.AMOUNT_ORIG) || 0;
    const time = response.data.MTS_CREATE;

    return FetchOrderResultFactory.createSuccessResult(
      status, //order status
      avg * filled, // Total cost
      avg, // Average price
      0, // No Fee Avail In res
      filled, // Filled quantity
      time // Time
    );
  }

  /**
   * Fetches my recent trades.
   * @async
   * @returns {Promise<object>} - List of recent trades.
   * @see https://docs.bitfinex.com/reference/rest-auth-trades
   */

  static async loadTradesForClosedOrder() {
    try {
      const response = await this.callExchangeAPI(this.endPoints.Trades, {});

      if (this.isError(response)) {
        console.error(
          "Error Message from response:",
          response.error || "Unknown error"
        );
        throw new Error(response.error || "An unknown error occured");
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
      } else if (trades && typeof trades === "object") {
        tradesArray = [trades];
      }

      if (tradesArray.length === 0) {
        return [
          {
            //Default Response Format
            order: "N/A",
            amount: 0,
            baseQty: 0,
            fee: {
              currency: "N/A",
              cost: 0,
            },
            error: null,
          },
        ];
      } else {
        const ccxtTrades = tradesArray.map((trade) => ({
          order: trade.ORDER_ID || "N/A",
          amount: trade.ORDER_PRICE || 0,
          baseQty: trade.EXEC_AMOUNT || 0,
          fee: {
            currency: trade.FEE_CURRENCY || "N/A",
            cost: Math.abs(trade.FEE) || 0,
          },
          error: trade.message || null,
        }));

        return ccxtTrades;
      }
    } catch (error) {
      console.error("Error converting trades:", error);
      throw error;
    }
  }

  /**
   * Fetches market candles in clears
   * @async
   * @param {string} candle - Trading Pair candles : trade:1m:tBTCUSD
   * @param {string} section - last / hist
   * @returns {Promise <Arrayt>} List of candles data.
   * @see https://docs.bitfinex.com/reference/rest-public-candles
   */

  static async fetchKlines(candle, section) {
    const endPoint = `/v2/candles/${candle}/${section}`;

    try {
      const options = {
        method: "GET",
        headers: { accept: "application/json" },
      };
      const uri_pub = "https://api-pub.bitfinex.com";
      const url = `${uri_pub}${endPoint}`;
      const data = await fetch(url, options);
      const response = await data.json();

      if (!response) {
        console.error(
          "Error message from response:",
          response.error || "Unknown error"
        );
        throw new Error(response.error || "Unknown error occured");
      }

      let klines = response.map((kline) => [
        kline[0], // time (timestamp)
        kline[5], // open
        kline[4], // high
        kline[3], // low
        kline[2], // close
        kline[1], // volume
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

export default BitFinex_Service;
