import { Auth, Payment } from "../Stock/Stock.js";
import sendLogs from "../Log_System/sendLogs.js";


jest.mock('../Log_System/sendLogs.js', () => ({
    authError: { error: jest.fn() },    // Mocked error log function for auth
    authInfo: { info: jest.fn() },      // Mocked info log function for auth
    authWarn: { warn: jest.fn() },      // Mocked warn log function for auth
    authDebug: { debug: jest.fn() },    // Mocked debug log function for auth
    paymentError: { error: jest.fn() }, // Mocked error log function for payment
    paymentInfo: { info: jest.fn() },   // Mocked info log function for payment
    paymentWarn: { warn: jest.fn() }    // Mocked warn log function for payment
}));

// Unit testing for the Auth function
describe("Authentication Unit test", () => {
    test("Should send the correct log for all authentication scenarios", async () => {
        // Test the success login scenario
        await Auth("Izhar-Pasha");
        expect(sendLogs.authInfo.info).toHaveBeenCalledWith(
            "User authenticated successfully", 
            "/api/v5/auth", 
            "Izhar-Pasha"
        );
        jest.clearAllMocks(); // Clear mocks after each call

        // Test the suspicious login scenario
        await Auth("MD_Izhar");
        expect(sendLogs.authWarn.warn).toHaveBeenCalledWith(
            "Suspicious User login Tracked!"
        );
        jest.clearAllMocks();

        // Test the failed login scenario (no username provided)
        await Auth("");
        expect(sendLogs.authError.error).toHaveBeenCalledWith(
            "User authentication failed"
        );
    });
});

// Unit testing for the Payment function
describe("Payment Unit test", () => {
    test("Should send the correct log for all payment scenarios", async () => {
        // Test the successful payment scenario
        await Payment("Izhar-Pasha", "Premium", "Paypal", "Success");
        expect(sendLogs.paymentInfo.info).toHaveBeenCalledWith(
            "Payment Successful!", 
            "/subscription/payment", 
            "Izhar-Pasha"
        );
        jest.clearAllMocks(); // Clear mocks after each call

        // Test the missing fields payment scenario
        await Payment("Izhar-Pasha", "Premium", "Paypal");
        expect(sendLogs.paymentWarn.warn).toHaveBeenCalledWith(
            "Please fill the required fields", 
            "/subscription/payment", 
            "Izhar-Pasha"
        );
        jest.clearAllMocks();

        // Test the failed payment scenario
        await Payment("Izhar-Pasha", "Premium", "Paypal", "Failure");
        expect(sendLogs.paymentError.error).toHaveBeenCalledWith(
            "Payment Failed!", 
            "/subscription/payment", 
            "Izhar-Pasha"
        );
    });
});