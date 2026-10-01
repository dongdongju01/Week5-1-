/**
 * 바이브 카페 엑셀 내보내기 및 파일 다운로드 유틸리티
 * SheetJS (xlsx) 라이브러리를 활용하여 .xlsx 파일 생성 및 저장 기능 제공
 */
import * as XLSX from 'xlsx';

// 주문 데이터 인터페이스
export interface OrderItem {
  id: string; // 고유 주문 번호
  orderDate: string; // 주문 일시 (YYYY-MM-DD HH:mm:ss)
  name: string; // 주문자 성명
  phone: string; // 연락처
  drinkName: string; // 선택 음료명
  drinkBasePrice: number; // 음료 기본 가격
  size: 'S' | 'M' | 'L'; // 사이즈 (S, M, L)
  sizePrice: number; // 사이즈 추가금 (0, 500, 1000)
  options: string[]; // 선택된 추가 옵션 목록
  optionsPrice: number; // 옵션 총 추가금
  quantity: number; // 수량
  unitPrice: number; // 잔당 가격 (음료 + 사이즈 + 옵션)
  totalPrice: number; // 총 결제 금액 (잔당 가격 * 수량)
  notes: string; // 고객 요청사항
}

/**
 * 주문 목록을 엑셀(.xlsx) 파일로 변환하여 브라우저에서 다운로드하는 함수
 * @param orders 저장할 주문 목록 배열
 * @param customFileName 커스텀 파일명 (선택)
 */
export function exportOrdersToExcel(orders: OrderItem[], customFileName?: string) {
  if (!orders || orders.length === 0) {
    throw new Error('내보낼 주문 내역이 없습니다.');
  }

  // 1. 엑셀 시트에 들어갈 행 데이터 매핑
  const excelData = orders.map((order, index) => ({
    '번호': index + 1,
    '주문번호': order.id,
    '주문일시': order.orderDate,
    '주문자명': order.name,
    '연락처': order.phone || '미입력',
    '음료명': order.drinkName,
    '사이즈': `${order.size} (+${order.sizePrice.toLocaleString('ko-KR')}원)`,
    '선택옵션': order.options.length > 0 ? order.options.join(', ') : '없음',
    '수량(잔)': order.quantity,
    '잔당단가(원)': order.unitPrice,
    '총결제금액(원)': order.totalPrice,
    '고객요청사항': order.notes || '없음',
  }));

  // 2. 워크시트 생성
  const worksheet = XLSX.utils.json_to_sheet(excelData);

  // 3. 열 너비 자동 조정
  worksheet['!cols'] = [
    { wch: 6 },  // 번호
    { wch: 14 }, // 주문번호
    { wch: 20 }, // 주문일시
    { wch: 12 }, // 주문자명
    { wch: 16 }, // 연락처
    { wch: 15 }, // 음료명
    { wch: 14 }, // 사이즈
    { wch: 24 }, // 선택옵션
    { wch: 10 }, // 수량
    { wch: 14 }, // 잔당단가
    { wch: 16 }, // 총결제금액
    { wch: 30 }, // 고객요청사항
  ];

  // 4. 워크북 생성 및 시트 추가
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '바이브카페_주문대장');

  // 5. 파일명 결정
  const today = new Date().toISOString().slice(0, 10);
  const fileName = customFileName || `바이브카페_주문내역_${today}.xlsx`;

  // 6. 파일 다운로드 트리거
  XLSX.writeFile(workbook, fileName);
}

/**
 * 단일 주문 건에 대한 개별 주문서 엑셀 파일 다운로드
 * @param order 단일 주문 정보
 */
export function exportSingleOrderToExcel(order: OrderItem) {
  const fileName = `바이브카페_주문서_${order.name}_${order.id}.xlsx`;
  exportOrdersToExcel([order], fileName);
}
