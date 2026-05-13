import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      "KEEP": "KEEP",
      "Discover and request your perfect fit.": "Discover and request your perfect fit.",
      "Please select color and size": "Please select color and size",
      "Fitting request submitted!": "Fitting request submitted!",
      "Added to Cart!": "Added to Cart!",
      "COLOR": "COLOR",
      "SIZE": "SIZE",
      "In Cart": "In Cart",
      "Add to Cart": "Add to Cart",
      "Request Fitting": "Request Fitting",
      
      // Admin
      "KEEP Admin Dashboard": "KEEP Admin Dashboard",
      "Real-time overview of fitting requests and operations.": "Real-time overview of fitting requests and operations.",
      "Export Data": "Export Data",
      "Today's Requests": "Today's Requests",
      "Awaiting Prep": "Awaiting Prep",
      "Completion Rate": "Completion Rate",
      "Live Request Log": "Live Request Log",
      "Time": "Time",
      "Req ID": "Req ID",
      "Product": "Product",
      "Spec": "Spec",
      "Status": "Status",
      "Elapsed": "Elapsed",
      "Done": "Done",
      "min ago": "min ago",
      "No request logs strictly available.": "No request logs currently available.",

      // Staff
      "KEEP Staff Portal": "KEEP Staff Portal",
      "Manage incoming fitting requests.": "Manage incoming fitting requests.",
      "No fitting requests at the moment.": "No fitting requests at the moment.",
      "ID": "ID",
      "ago": "ago",
      "Start Preparing": "Start Preparing",
      "Mark as Ready": "Mark as Ready",
      "Complete": "Complete",
      "Requested Item": "Requested Item",
      "Color": "Color",
      "Size": "Size",
      "Fitting Room": "Fitting Room",

      // Statuses
      "PENDING": "PENDING",
      "PREPARING": "PREPARING",
      "READY": "READY",
      "COMPLETED": "COMPLETED",
      "pending": "REQUESTED",
      "assigned": "PREPARING",
      "completed": "COMPLETED"
    }
  },
  ko: {
    translation: {
      "KEEP": "KEEP",
      "Discover and request your perfect fit.": "완벽한 핏을 찾고 요청해보세요.",
      "Please select color and size": "색상과 사이즈를 선택해주세요",
      "Fitting request submitted!": "피팅 요청이 완료되었습니다!",
      "Added to Cart!": "장바구니에 추가되었습니다!",
      "COLOR": "색상 (COLOR)",
      "SIZE": "사이즈 (SIZE)",
      "In Cart": "장바구니 담김",
      "Add to Cart": "장바구니 담기",
      "Request Fitting": "피팅 번호표 발급 / 요청",
      "NFC Tagging System": "NFC 태깅 시스템",
      "Mock NFC Tagging (Tap to simulate)": "모의 NFC 태깅 (버튼을 눌러 태깅)",
      "Swipe left/right to browse, up to dismiss": "좌우로 넘겨보기, 위로 쓸어올려 제거",
      "No products tagged yet.": "아직 태깅된 상품이 없습니다.",
      "Tap a product above to tag it.": "상단의 상품을 눌러 태깅해보세요.",
      "Tagged Products": "태깅된 상품",
      "Confirm & Request Fitting": "피팅룸 배정 받기",
      
      // Admin
      "KEEP Admin Dashboard": "KEEP 관리자 대시보드",
      "Real-time overview of fitting requests and operations.": "피팅 요청 및 운영 현황 실시간 요약.",
      "Export Data": "데이터 내보내기",
      "Today's Requests": "오늘의 요청",
      "Awaiting Prep": "준비 대기 중",
      "Completion Rate": "완료율",
      "Live Request Log": "실시간 요청 로그",
      "Time": "시간",
      "Req ID": "요청 ID",
      "Product": "상품",
      "Spec": "옵션",
      "Status": "상태",
      "Elapsed": "경과",
      "Done": "완료",
      "min ago": "분 전",
      "No request logs strictly available.": "현재 사용 가능한 요청 로그가 없습니다.",

      // Staff
      "KEEP Staff Portal": "KEEP 스태프 포털",
      "Manage incoming fitting requests.": "접수된 피팅 요청을 관리합니다.",
      "No fitting requests at the moment.": "현재 접수된 피팅 요청이 없습니다.",
      "ID": "번호",
      "ago": "전",
      "Start Preparing": "상품 준비 시작",
      "Mark as Ready": "준비 완료(고객 호출)",
      "Complete": "전달 완료",
      "Requested Item": "요청 상품",
      "Color": "색상",
      "Size": "사이즈",
      "Fitting Room": "피팅룸",

      "PENDING": "대기중",
      "PREPARING": "준비중",
      "READY": "준비완료",
      "COMPLETED": "완료",
      "pending": "접수됨",
      "assigned": "준비중",
      "completed": "전달완료"
    }
  }
};

const savedLang = localStorage.getItem('keep-language') || 'ko';

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: savedLang, // Default language
    fallbackLng: "ko",
    interpolation: {
      escapeValue: false 
    }
  });

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === 'keep-language' && e.newValue) {
      i18n.changeLanguage(e.newValue);
    }
  });
}

export default i18n;
