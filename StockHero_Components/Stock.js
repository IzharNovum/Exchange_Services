import sendLogs from "../Log_System/sendLogs.js";



// NOTE: Uncomment this when using auth function for logs...
// const userName = process.env.USER_NAME;





export async function Auth(userName) {//REMOVE USERNAME PARAM WHEN USING AUTH FUNCTION..
    try {
        console.log(
            "username:", userName
        )
        const endPoint = "/api/v5/auth";

        if (userName === "Izhar-Pasha") {
            await sendLogs.authInfo.info('User authenticated successfully', endPoint, userName);
        } else if (!userName) {
            await sendLogs.authError.error('User authentication failed');
        } else if(userName !== "Izhar-Pasha"){
            await sendLogs.authWarn.warn('Suspicious User login Tracked!');
        }
    } catch (error) {
        await sendLogs.authError.error("An error occurred during authentication: ", endPoint, userName);
        console.error("An error occurred during authentication:", error);
    }
}

// Auth();


export async function Payment(userName, subscriptionType, paymentMethod, transactionStatus) {
    try {
        const endPoint = "/subscription/payment";
        const reqFilled = {
            userName: userName,
            subscriptionType: subscriptionType,
            paymentMethod: paymentMethod,
        };

        if (transactionStatus === "Success") {
            await sendLogs.paymentInfo.info("Payment Successful!", endPoint, userName);
        } else if (transactionStatus === "Failure") {
            await sendLogs.paymentError.error("Payment Failed!", endPoint, userName);
        } else if (!userName || !subscriptionType || !paymentMethod || !transactionStatus) {
            await sendLogs.paymentWarn.warn("Please fill the required fields", endPoint, userName);
        }
        
        return reqFilled;
    } catch (error) {
        await sendLogs.paymentError.error("An error occurred during authentication: ", endPoint, userName);

        console.error("An error occurred during Payment:", error);
    }
}

// Payment("Izhar-Pasha", "Premium", "Paypal", "Success");
