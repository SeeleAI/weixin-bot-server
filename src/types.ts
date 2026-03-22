export const MessageItemType = {
  TEXT: 1,
  IMAGE: 2,
  VOICE: 3,
  FILE: 4,
  VIDEO: 5,
} as const;

export interface WeixinMessage {
  seq?: number;
  message_id?: number;
  from_user_id?: string;
  to_user_id?: string;
  create_time_ms?: number;
  session_id?: string;
  /** 1 = USER, 2 = BOT */
  message_type?: number;
  /** 0 = NEW, 1 = GENERATING, 2 = FINISH */
  message_state?: number;
  item_list?: MessageItem[];
  context_token?: string;
}

export interface MessageItem {
  type?: number;
  text_item?: { text?: string };
  image_item?: ImageItem;
  voice_item?: VoiceItem;
  file_item?: { file_name?: string; media?: CDNMedia };
  video_item?: { media?: CDNMedia };
  ref_msg?: { message_item?: MessageItem; title?: string };
}

export interface ImageItem {
  url?: string;
  aeskey?: string;
  mid_size?: number;
  media?: CDNMedia;
}

export interface VoiceItem {
  text?: string;
  voice_length?: number;
  encode_type?: number;
  media?: CDNMedia;
}

export interface CDNMedia {
  encrypt_query_param?: string;
  aes_key?: string;
  encrypt_type?: number;
}

export interface GetUpdatesResp {
  ret?: number;
  errcode?: number;
  errmsg?: string;
  msgs?: WeixinMessage[];
  get_updates_buf?: string;
  longpolling_timeout_ms?: number;
}

export interface QRCodeResponse {
  qrcode: string;
  qrcode_img_content: string;
}

export interface QRStatusResponse {
  status: "wait" | "scaned" | "confirmed" | "expired";
  bot_token?: string;
  ilink_bot_id?: string;
  baseurl?: string;
  ilink_user_id?: string;
}

export interface Env {}
