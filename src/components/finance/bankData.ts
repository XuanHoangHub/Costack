// Danh mục ngân hàng & ví điện tử Việt Nam và quốc tế với mã màu, logo và cơ chế tự động nhận diện

export interface BankInfo {
  code: string;
  shortName: string;
  fullName: string;
  brandColor: string;
  accentColor: string;
  textColor: string;
  keywords: string[];
  defaultType: string;
  iconType: "vcb" | "tcb" | "mb" | "acb" | "vpb" | "bidv" | "ctg" | "tpb" | "stb" | "vib" | "hdb" | "shb" | "msb" | "ocb" | "sea" | "agr" | "momo" | "zalopay" | "viettel" | "cash" | "card" | "paypal" | "generic";
}

export const BANK_DIRECTORY: BankInfo[] = [
  {
    code: "VCB",
    shortName: "Vietcombank",
    fullName: "Ngân hàng TMCP Ngoại Thương Việt Nam",
    brandColor: "#005432",
    accentColor: "#70b82c",
    textColor: "#ffffff",
    keywords: ["vcb", "vietcombank", "ngoai thuong", "ngoại thương", "vietcom"],
    defaultType: "Tài khoản thanh toán",
    iconType: "vcb",
  },
  {
    code: "TCB",
    shortName: "Techcombank",
    fullName: "Ngân hàng TMCP Kỹ Thương Việt Nam",
    brandColor: "#e11b22",
    accentColor: "#111827",
    textColor: "#ffffff",
    keywords: ["tcb", "techcombank", "ky thuong", "kỹ thương", "techcom"],
    defaultType: "Tài khoản thanh toán",
    iconType: "tcb",
  },
  {
    code: "MB",
    shortName: "MB Bank",
    fullName: "Ngân hàng TMCP Quân Đội",
    brandColor: "#0033a0",
    accentColor: "#e11b22",
    textColor: "#ffffff",
    keywords: ["mb", "mbb", "mbbank", "quan doi", "quân đội", "mb bank"],
    defaultType: "Tài khoản thanh toán",
    iconType: "mb",
  },
  {
    code: "ACB",
    shortName: "ACB",
    fullName: "Ngân hàng TMCP Á Châu",
    brandColor: "#005baa",
    accentColor: "#0088cc",
    textColor: "#ffffff",
    keywords: ["acb", "a chau", "á châu"],
    defaultType: "Tài khoản thanh toán",
    iconType: "acb",
  },
  {
    code: "VPB",
    shortName: "VPBank",
    fullName: "Ngân hàng TMCP Việt Nam Thịnh Vượng",
    brandColor: "#009e52",
    accentColor: "#ff671f",
    textColor: "#ffffff",
    keywords: ["vpb", "vpbank", "thinh vuong", "thịnh vượng"],
    defaultType: "Tài khoản thanh toán",
    iconType: "vpb",
  },
  {
    code: "BIDV",
    shortName: "BIDV",
    fullName: "Ngân hàng TMCP Đầu tư và Phát triển Việt Nam",
    brandColor: "#00685e",
    accentColor: "#22c55e",
    textColor: "#ffffff",
    keywords: ["bidv", "dau tu", "đầu tư và phát triển", "đầu tư"],
    defaultType: "Tài khoản thanh toán",
    iconType: "bidv",
  },
  {
    code: "CTG",
    shortName: "VietinBank",
    fullName: "Ngân hàng TMCP Công Thương Việt Nam",
    brandColor: "#005596",
    accentColor: "#d32f2f",
    textColor: "#ffffff",
    keywords: ["ctg", "vietinbank", "vietin", "cong thuong", "công thương"],
    defaultType: "Tài khoản thanh toán",
    iconType: "ctg",
  },
  {
    code: "TPB",
    shortName: "TPBank",
    fullName: "Ngân hàng TMCP Tiên Phong",
    brandColor: "#6c2382",
    accentColor: "#f58220",
    textColor: "#ffffff",
    keywords: ["tpb", "tpbank", "tien phong", "tiên phong"],
    defaultType: "Tài khoản thanh toán",
    iconType: "tpb",
  },
  {
    code: "STB",
    shortName: "Sacombank",
    fullName: "Ngân hàng TMCP Sài Gòn Thương Tín",
    brandColor: "#004b8d",
    accentColor: "#0284c7",
    textColor: "#ffffff",
    keywords: ["stb", "sacombank", "sai gon thuong tin", "sài gòn thương tín"],
    defaultType: "Tài khoản thanh toán",
    iconType: "stb",
  },
  {
    code: "VIB",
    shortName: "VIB",
    fullName: "Ngân hàng TMCP Quốc Tế Việt Nam",
    brandColor: "#0057b7",
    accentColor: "#f26522",
    textColor: "#ffffff",
    keywords: ["vib", "quoc te", "quốc tế"],
    defaultType: "Tài khoản thanh toán",
    iconType: "vib",
  },
  {
    code: "HDB",
    shortName: "HDBank",
    fullName: "Ngân hàng TMCP Phát triển TP.HCM",
    brandColor: "#d8242b",
    accentColor: "#ffcb05",
    textColor: "#ffffff",
    keywords: ["hdb", "hdbank", "phat trien tphcm", "phát triển tp.hcm"],
    defaultType: "Tài khoản thanh toán",
    iconType: "hdb",
  },
  {
    code: "SHB",
    shortName: "SHB",
    fullName: "Ngân hàng TMCP Sài Gòn - Hà Nội",
    brandColor: "#f26522",
    accentColor: "#0284c7",
    textColor: "#ffffff",
    keywords: ["shb", "sai gon ha noi", "sài gòn hà nội"],
    defaultType: "Tài khoản thanh toán",
    iconType: "shb",
  },
  {
    code: "MSB",
    shortName: "MSB",
    fullName: "Ngân hàng TMCP Hàng Hải Việt Nam",
    brandColor: "#e53935",
    accentColor: "#fb8c00",
    textColor: "#ffffff",
    keywords: ["msb", "hang hai", "hàng hải", "maritime"],
    defaultType: "Tài khoản thanh toán",
    iconType: "msb",
  },
  {
    code: "OCB",
    shortName: "OCB",
    fullName: "Ngân hàng TMCP Phương Đông",
    brandColor: "#00904b",
    accentColor: "#f9a01b",
    textColor: "#ffffff",
    keywords: ["ocb", "phuong dong", "phương đông"],
    defaultType: "Tài khoản thanh toán",
    iconType: "ocb",
  },
  {
    code: "SEA",
    shortName: "SeABank",
    fullName: "Ngân hàng TMCP Đông Nam Á",
    brandColor: "#d3202a",
    accentColor: "#1e3a8a",
    textColor: "#ffffff",
    keywords: ["sea", "seabank", "dong nam a", "đông nam á"],
    defaultType: "Tài khoản thanh toán",
    iconType: "sea",
  },
  {
    code: "AGR",
    shortName: "Agribank",
    fullName: "Ngân hàng Nông nghiệp và Phát triển Nông thôn Việt Nam",
    brandColor: "#8c1d2f",
    accentColor: "#007a33",
    textColor: "#ffffff",
    keywords: ["agr", "agribank", "nong nghiep", "nông nghiệp"],
    defaultType: "Tài khoản thanh toán",
    iconType: "agr",
  },
  {
    code: "MOMO",
    shortName: "Ví MoMo",
    fullName: "Ví điện tử MoMo",
    brandColor: "#d82d8b",
    accentColor: "#be185d",
    textColor: "#ffffff",
    keywords: ["momo", "vi momo", "ví momo"],
    defaultType: "Ví điện tử",
    iconType: "momo",
  },
  {
    code: "ZALOPAY",
    shortName: "ZaloPay",
    fullName: "Ví điện tử ZaloPay",
    brandColor: "#008fe5",
    accentColor: "#0284c7",
    textColor: "#ffffff",
    keywords: ["zalopay", "zalo pay", "zalo", "ví zalopay"],
    defaultType: "Ví điện tử",
    iconType: "zalopay",
  },
  {
    code: "VIETTEL",
    shortName: "Viettel Money",
    fullName: "Viettel Money (ViettelPay)",
    brandColor: "#ea1d25",
    accentColor: "#ffffff",
    textColor: "#ffffff",
    keywords: ["viettel", "viettel money", "viettelpay", "vtm"],
    defaultType: "Ví điện tử",
    iconType: "viettel",
  },
  {
    code: "CASH",
    shortName: "Tiền mặt tại quỹ",
    fullName: "Quỹ tiền mặt / Két sắt / Tiền mặt",
    brandColor: "#059669",
    accentColor: "#10b981",
    textColor: "#ffffff",
    keywords: ["tien mat", "tiền mặt", "cash", "quy", "quỹ", "ket sat", "két sắt"],
    defaultType: "Tiền mặt",
    iconType: "cash",
  },
  {
    code: "CARD",
    shortName: "Thẻ tín dụng",
    fullName: "Thẻ tín dụng Visa / MasterCard / JCB",
    brandColor: "#4f46e5",
    accentColor: "#818cf8",
    textColor: "#ffffff",
    keywords: ["the tin dung", "thẻ tín dụng", "credit", "visa", "mastercard"],
    defaultType: "Thẻ tín dụng",
    iconType: "card",
  },
  {
    code: "PAYPAL",
    shortName: "PayPal",
    fullName: "Tài khoản thanh toán quốc tế PayPal",
    brandColor: "#003087",
    accentColor: "#0079c1",
    textColor: "#ffffff",
    keywords: ["paypal", "quoc te", "usd"],
    defaultType: "Tài khoản quốc tế",
    iconType: "paypal",
  },
];

// Ngân hàng gợi ý phổ biến cho Quick Picker
export const POPULAR_BANKS: BankInfo[] = BANK_DIRECTORY.filter(b =>
  ["VCB", "TCB", "MB", "ACB", "VPB", "BIDV", "CTG", "TPB", "MOMO", "ZALOPAY", "CASH"].includes(b.code)
);

// Nhận diện ngân hàng thông minh từ từ khóa nhập vào
export function detectBank(query?: string): BankInfo {
  if (!query || !query.trim()) {
    return {
      code: "GENERIC",
      shortName: "Tài khoản",
      fullName: "Tài khoản thanh toán",
      brandColor: "#6366f1",
      accentColor: "#818cf8",
      textColor: "#ffffff",
      keywords: [],
      defaultType: "Tài khoản thanh toán",
      iconType: "generic",
    };
  }

  const clean = query.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // Tìm kiếm chính xác mã hoặc tên viết tắt
  const exact = BANK_DIRECTORY.find(
    b => b.code.toLowerCase() === clean || b.shortName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === clean
  );
  if (exact) return exact;

  // Tìm kiếm theo từ khóa liên quan
  const matched = BANK_DIRECTORY.find(b => {
    return b.keywords.some(kw => {
      const cleanKw = kw.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return clean.includes(cleanKw) || cleanKw.includes(clean);
    });
  });

  if (matched) return matched;

  // Trường hợp không tìm thấy: tạo thông tin generic với màu gradient thanh lịch
  return {
    code: "CUSTOM",
    shortName: query.trim(),
    fullName: query.trim(),
    brandColor: "#6366f1",
    accentColor: "#818cf8",
    textColor: "#ffffff",
    keywords: [],
    defaultType: "Tài khoản thanh toán",
    iconType: "generic",
  };
}
