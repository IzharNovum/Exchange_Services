import sequelize from "../DB/database";
import { DataTypes, Model } from "sequelize";

class Pair extends Model{}

Pair.init({
    id: {
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        allowNull: false,
        autoIncrement: true,
    },
    from: {
        type: DataTypes.STRING(9),
        allowNull: true,
    },
    to: {
        type: DataTypes.STRING(9),
        allowNull: true,
    },
    name: {
        type: DataTypes.STRING(191),
        allowNull: false,
    },
    updated_at: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    created_at: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    kline_exchange_id: {
        type: DataTypes.TINYINT,
        allowNull: true,
    },
    contract_type: {
        type: DataTypes.ENUM('perpetual', 'deliver'),
        allowNull: true,
    },
    contract_time: {
        type: DataTypes.STRING(255),
        allowNull: true,
    },
},
{
    sequelize,
    modelName: 'Pair',
    tableName: 'pairs',
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
    engine: 'InnoDB',
    timestamps: true, 
    paranoid: true,
    freezeTableName: true,
});

export default Pair;
