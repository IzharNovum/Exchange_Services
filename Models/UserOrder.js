class UserOrder{
    static STATUS_OPENS_CCXT = ['open', 'new', 'NEW', 'ongoing'];
    static STATUS_CANCELS_CCXT = ['CANCELLED', 'cancelled', 'CANCELED'];
    static STATUS_FILLED_CCXT = ['FILLED', 'filled', 'closed', 'CLOSED'];


    static STATUS_PARTIAL_FILLED = 'partial_filled';
    static STATUS_CANCELLED = 'cancelled';
    static STATUS_FILLED = 'filled';
    static STATUS_ONGOING = 'ongoing';

}


export default UserOrder;