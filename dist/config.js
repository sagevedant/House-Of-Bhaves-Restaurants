"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config();
exports.config = {
    PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
    absoluteDatabasePath: path_1.default.resolve(process.env.DATABASE_PATH || './data/hob-restaurant.db'),
    metaApiBase: 'https://graph.facebook.com/v21.0',
    whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
    metaAccessToken: process.env.META_ACCESS_TOKEN || '',
    webhookVerifyToken: process.env.WEBHOOK_VERIFY_TOKEN || 'hob_restaurant_secret',
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    makeWebhookUrl: process.env.MAKE_WEBHOOK_URL || '',
    managerPhone: process.env.MANAGER_PHONE || '919699533441',
    mockWhatsApp: process.env.MOCK_WHATSAPP === 'true' || (!process.env.META_ACCESS_TOKEN && !process.env.WHATSAPP_PHONE_NUMBER_ID)
};
//# sourceMappingURL=config.js.map