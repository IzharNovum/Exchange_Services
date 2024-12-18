import sequelize from "../DB/database.js";
import { Model, DataTypes } from "sequelize";

class UserExchange extends Model{}

UserExchange.init({
    id:{
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
    },
    user_id:{
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
    },
    deposit_address:{
        type: DataTypes.STRING(191),
        allowNull: true,
    },
    status:{
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
    },
    updated_at:{
        type: DataTypes.DATE,
        allowNull: true,
    },
    exchange_id:{
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
    },
    api_key:{
        type: DataTypes.STRING(1000),
        allowNull: true,
    },
    secret:{
        type: DataTypes.STRING(1000),
        allowNull: false,
        defaultValue: '',
    },
    account:{
        type: DataTypes.STRING(1000),
        allowNull: true,
    },

    side:{
      type: DataTypes.STRING,
      allowNull: false,
    },

    Timeinforce: {
        type: DataTypes.ENUM('GTC', 'IOC', 'FOK'),
        allowNull: false,
      },
    
      Marginmode: {
        type: DataTypes.ENUM('isolated', 'crossed'),
        allowNull: false,
      },
    
      Margincoin: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    
      Leverage: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    
      Clientorderid: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true, 
      },
      
      Accntuuid: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    
      Tgtccy: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    
      TdMode: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    
      Idr: {
        type: DataTypes.NUMBER, 
        allowNull: true,  
      },
    created_at:{
        type: DataTypes.DATE,
        allowNull: true,
    },
    deleted_at:{
        type: DataTypes.DATE,
        allowNull: true,
    },
},
{
    sequelize,
    modelName: "UserExchange",
    tableName: "user_exchanges",
    charset: "utf8mb4",
    collate: "utf8mb4_unicode_ci",
    engine: "InnoDB",
    timestamps: false, 
    paranoid: true, 
    freezeTableName: true,
    indexes: [
      {
        unique: true,
        fields: ["user_id", "exchange_id", "deleted_at"], 
        name: "ux_key", 
      },
      {
        fields: ["exchange_id"], 
      },
    ],
  }
);

export default UserExchange;