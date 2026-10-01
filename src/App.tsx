/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useId, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  Download, 
  Trash2, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  Coffee,
  ReceiptText,
  Search,
  ArrowLeft,
  Settings
} from 'lucide-react';
import { OrderItem, exportOrdersToExcel, exportSingleOrderToExcel } from './utils/excel';

// -------------------------------------------------------------
// 음료 메뉴 데이터 정의 (가격 정보 포함)
// -------------------------------------------------------------
interface DrinkOption {
  id: string;
  name: string;
  price: number;
}

const DRINK_LIST: DrinkOption[] = [
  { id: 'americano', name: '아메리카노', price: 3500 },
  { id: 'latte', name: '카페라떼', price: 4000 },
  { id: 'mocha', name: '카페모카', price: 4500 },
  { id: 'vanilla', name: '바닐라라떼', price: 4500 },
  { id: 'greentea', name: '녹차라떼', price: 4500 },
];

// -------------------------------------------------------------
// 사이즈 데이터 정의 (기본값 M)
// -------------------------------------------------------------
interface SizeOption {
  id: 'S' | 'M' | 'L';
  name: string;
  extraPrice: number;
}

const SIZE_LIST: SizeOption[] = [
  { id: 'S', name: 'S', extraPrice: 0 },
  { id: 'M', name: 'M (기본)', extraPrice: 500 },
  { id: 'L', name: 'L', extraPrice: 1000 },
];

// -------------------------------------------------------------
// 추가 옵션 데이터 정의
// -------------------------------------------------------------
interface ExtraOption {
  id: string;
  name: string;
  price: number;
}

const OPTION_LIST: ExtraOption[] = [
  { id: 'shot', name: '샷 추가', price: 500 },
  { id: 'cream', name: '크림 추가', price: 500 },
  { id: 'syrup', name: '시럽 추가', price: 300 },
  { id: 'decaf', name: '디카페인', price: 0 },
];

// 로컬 스토리지 저장 키
const LOCAL_STORAGE_KEY = 'vibe_cafe_orders_v1';

export default function App() {
  // -----------------------------------------------------------
  // 화면 분리: 'order' (고객 주문 화면) vs 'admin' (사장님 엑셀 관리 화면)
  // -----------------------------------------------------------
  const [currentView, setCurrentView] = useState<'order' | 'admin'>('order');

  // -----------------------------------------------------------
  // 고유 id 생성을 위한 React useId 훅 (Label 연결용)
  // -----------------------------------------------------------
  const nameInputId = useId();
  const phoneInputId = useId();
  const drinkSelectId = useId();
  const quantityInputId = useId();
  const notesTextareaId = useId();

  // -----------------------------------------------------------
  // 주문 폼 상태 관리
  // -----------------------------------------------------------
  const [customerName, setCustomerName] = useState<string>(''); // 이름
  const [phoneNumber, setPhoneNumber] = useState<string>(''); // 전화번호
  const [selectedDrinkId, setSelectedDrinkId] = useState<string>(''); // 음료 선택
  const [selectedSize, setSelectedSize] = useState<'S' | 'M' | 'L'>('M'); // 사이즈 (기본값 M)
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]); // 추가 옵션 id 목록
  const [quantity, setQuantity] = useState<number>(1); // 수량 (최소 1, 최대 10, 기본값 1)
  const [notes, setNotes] = useState<string>(''); // 요청사항

  // -----------------------------------------------------------
  // 알림 및 확인 메시지 상태
  // -----------------------------------------------------------
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmationMessage, setConfirmationMessage] = useState<string | null>(null);

  // -----------------------------------------------------------
  // 주문 내역(장부) 상태 및 엑셀 관리 (별도 관리자 화면용)
  // -----------------------------------------------------------
  const [orderHistory, setOrderHistory] = useState<OrderItem[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // 로컬 스토리지 읽기 에러 시 무시
    }
    return [];
  });

  // 장부 검색어
  const [searchKeyword, setSearchKeyword] = useState<string>('');

  // 주문 내역 변경 시 로컬 스토리지 동기화
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(orderHistory));
    } catch {
      // 로컬 스토리지 저장 에러 핸들링
    }
  }, [orderHistory]);

  // -----------------------------------------------------------
  // 실시간 예상 금액 계산 (JavaScript 기능)
  // 음료 + 사이즈 + 추가옵션들의 합에 수량을 곱하여 산출
  // -----------------------------------------------------------
  const selectedDrink = DRINK_LIST.find((d) => d.id === selectedDrinkId);
  const drinkBasePrice = selectedDrink ? selectedDrink.price : 0;
  
  const sizeObj = SIZE_LIST.find((s) => s.id === selectedSize);
  const sizeExtraPrice = sizeObj ? sizeObj.extraPrice : 0;

  const optionsExtraPrice = selectedOptions.reduce((acc, optId) => {
    const opt = OPTION_LIST.find((o) => o.id === optId);
    return acc + (opt ? opt.price : 0);
  }, 0);

  // 1잔당 단가
  const unitPrice = drinkBasePrice + sizeExtraPrice + optionsExtraPrice;
  // 최종 예상 총 금액
  const estimatedTotalPrice = unitPrice * (quantity > 0 ? quantity : 1);

  // -----------------------------------------------------------
  // 옵션 체크박스 토글 핸들러
  // -----------------------------------------------------------
  const handleOptionChange = (optionId: string) => {
    setSelectedOptions((prev) =>
      prev.includes(optionId)
        ? prev.filter((id) => id !== optionId)
        : [...prev, optionId]
    );
  };

  // -----------------------------------------------------------
  // 다시 작성 (초기화) 버튼 핸들러
  // 모든 입력값과 금액을 초기 상태로 복구
  // -----------------------------------------------------------
  const handleReset = () => {
    setCustomerName('');
    setPhoneNumber('');
    setSelectedDrinkId('');
    setSelectedSize('M'); // 기본값 M
    setSelectedOptions([]);
    setQuantity(1);
    setNotes('');
    setErrorMessage(null);
    setConfirmationMessage(null);
  };

  // -----------------------------------------------------------
  // 주문하기 버튼 클릭 핸들러
  // -----------------------------------------------------------
  const handleSubmitOrder = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // 1. 이름 필수 유효성 검사
    if (!customerName.trim()) {
      setErrorMessage('이름을 입력해주세요');
      return;
    }

    // 2. 음료 선택 유효성 검사
    if (!selectedDrinkId || !selectedDrink) {
      setErrorMessage('음료를 선택해주세요');
      return;
    }

    // 3. 선택된 옵션명 텍스트 정리 (예: "샷 추가", "시럽 추가")
    const optionNames = selectedOptions.map((optId) => {
      const found = OPTION_LIST.find((o) => o.id === optId);
      return found ? found.name : '';
    }).filter(Boolean);

    // 옵션 텍스트 형식화: 괄호 포함 (예: " (샷 추가)" 또는 " (샷 추가, 시럽 추가)")
    const optionText = optionNames.length > 0 ? ` (${optionNames.join(', ')})` : '';

    // 4. 주문 확인 메시지 작성 (고객에게 보여줄 안내문)
    // 예) "홍길동님, 카페라떼 M사이즈 (샷 추가) 1잔, 총 5,000원 주문이 접수되었습니다!"
    const formattedTotalPrice = estimatedTotalPrice.toLocaleString('ko-KR');
    const confirmText = `${customerName.trim()}님, ${selectedDrink.name} ${selectedSize}사이즈${optionText} ${quantity}잔, 총 ${formattedTotalPrice}원 주문이 접수되었습니다!`;
    
    setConfirmationMessage(confirmText);

    // 5. 관리자 전용 엑셀 장부에 안전하게 주문 데이터 적재
    const now = new Date();
    const dateString = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    const orderId = `ORD-${Date.now().toString().slice(-6)}`;

    const newOrder: OrderItem = {
      id: orderId,
      orderDate: dateString,
      name: customerName.trim(),
      phone: phoneNumber.trim(),
      drinkName: selectedDrink.name,
      drinkBasePrice: selectedDrink.price,
      size: selectedSize,
      sizePrice: sizeExtraPrice,
      options: optionNames,
      optionsPrice: optionsExtraPrice,
      quantity: quantity,
      unitPrice: unitPrice,
      totalPrice: estimatedTotalPrice,
      notes: notes.trim(),
    };

    // 주문 목록 대장에 추가 (고객 화면에서는 보이지 않고, 관리자 화면에서만 확인 가능)
    const updatedOrders = [newOrder, ...orderHistory];
    setOrderHistory(updatedOrders);
  };

  // -----------------------------------------------------------
  // [관리자 전용] 전체 주문 엑셀(.xlsx) 파일 다운로드 핸들러
  // -----------------------------------------------------------
  const handleExportAllToExcel = () => {
    if (orderHistory.length === 0) {
      alert('엑셀로 내보낼 주문 내역이 없습니다.');
      return;
    }
    exportOrdersToExcel(orderHistory);
  };

  // -----------------------------------------------------------
  // [관리자 전용] 특정 주문 1건 삭제
  // -----------------------------------------------------------
  const handleDeleteOrder = (orderId: string) => {
    setOrderHistory((prev) => prev.filter((order) => order.id !== orderId));
  };

  // -----------------------------------------------------------
  // [관리자 전용] 주문 장부 전체 초기화
  // -----------------------------------------------------------
  const handleClearAllOrders = () => {
    if (window.confirm('정말로 모든 주문 내역을 삭제하시겠습니까?')) {
      setOrderHistory([]);
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
  };

  // 검색 필터링된 주문 목록
  const filteredOrders = orderHistory.filter((order) => {
    if (!searchKeyword.trim()) return true;
    const term = searchKeyword.toLowerCase();
    return (
      order.name.toLowerCase().includes(term) ||
      order.drinkName.toLowerCase().includes(term) ||
      order.phone.includes(term) ||
      order.id.toLowerCase().includes(term)
    );
  });

  // 장부 전체 누적 매출 계산
  const totalRevenue = orderHistory.reduce((sum, order) => sum + order.totalPrice, 0);

  return (
    <div className="min-h-screen py-6 px-4 sm:px-6 bg-[#faf6f0] flex flex-col items-center">
      
      {/* ========================================================= */}
      {/* 상단 뷰 전환 네비게이션: 고객 주문 vs 사장님 엑셀 관리 */}
      {/* ========================================================= */}
      <div className="w-full max-w-[520px] mb-4 flex items-center justify-between">
        <div className="inline-flex p-1 bg-[#ede4db] rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => setCurrentView('order')}
            className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              currentView === 'order'
                ? 'bg-white text-[#6b4226] shadow-sm'
                : 'text-[#8c674b] hover:text-[#6b4226]'
            }`}
          >
            <Coffee className="w-3.5 h-3.5" />
            <span>고객 주문하기</span>
          </button>
          <button
            type="button"
            onClick={() => setCurrentView('admin')}
            className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              currentView === 'admin'
                ? 'bg-[#6b4226] text-white shadow-sm'
                : 'text-[#8c674b] hover:text-[#6b4226]'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>관리자 엑셀 장부</span>
            {orderHistory.length > 0 && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                currentView === 'admin' ? 'bg-[#825230] text-white' : 'bg-[#e2d5c8] text-[#6b4226]'
              }`}>
                {orderHistory.length}
              </span>
            )}
          </button>
        </div>

        {/* 현재 모드 표시 안내 */}
        <span className="text-[11px] text-[#a08571] hidden sm:inline">
          {currentView === 'order' ? '고객 주문 화면' : '개인 엑셀 관리 모드'}
        </span>
      </div>

      {/* ========================================================= */}
      {/* 1. [고객 주문 화면] - 엑셀 및 장부 요소를 완전히 숨김 */}
      {/* ========================================================= */}
      {currentView === 'order' && (
        <div className="w-full max-w-[520px] mx-auto space-y-6">
          
          {/* [페이지 상단] 카페 로고, 카페 이름, 부제 */}
          <header className="text-center pt-2 pb-1">
            <div className="text-5xl mb-2 select-none" role="img" aria-label="커피 아이콘">
              ☕
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-[#6b4226]">
              바이브 카페
            </h1>
            <p className="text-sm mt-1 text-[#8c674b] font-medium">
              당신의 하루에 바이브를 더하다
            </p>
          </header>

          {/* [주문서 카드] 메인 입력 폼 */}
          <div className="bg-white rounded-2xl p-6 sm:p-7 shadow-[0_4px_20px_rgba(107,66,38,0.08)] border border-[#ede3da]">
            
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-[#f0e7df]">
              <div className="flex items-center gap-2 text-[#6b4226]">
                <Coffee className="w-5 h-5 text-[#6b4226]" />
                <h2 className="text-lg font-bold">음료 주문서</h2>
              </div>
              <span className="text-xs text-[#a07e66]">
                * 표시는 필수 입력 항목입니다
              </span>
            </div>

            <form onSubmit={handleSubmitOrder} className="space-y-5" noValidate>
              
              {/* 1. 이름 (필수, text) */}
              <div>
                <label 
                  htmlFor={nameInputId} 
                  className="block text-sm font-semibold text-[#54331d] mb-1.5"
                >
                  이름 <span className="text-red-500 font-bold">*</span>
                </label>
                <input
                  id={nameInputId}
                  type="text"
                  value={customerName}
                  onChange={(e) => {
                    setCustomerName(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="주문자 성함을 입력해주세요"
                  className="cafe-input"
                  autoComplete="name"
                  required
                />
              </div>

              {/* 2. 전화번호 (tel) */}
              <div>
                <label 
                  htmlFor={phoneInputId} 
                  className="block text-sm font-semibold text-[#54331d] mb-1.5"
                >
                  전화번호
                </label>
                <input
                  id={phoneInputId}
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="010-0000-0000 (선택사항)"
                  className="cafe-input"
                  autoComplete="tel"
                />
              </div>

              {/* 3. 음료 선택 (드롭다운) */}
              <div>
                <label 
                  htmlFor={drinkSelectId} 
                  className="block text-sm font-semibold text-[#54331d] mb-1.5"
                >
                  음료 선택 <span className="text-red-500 font-bold">*</span>
                </label>
                <div className="relative">
                  <select
                    id={drinkSelectId}
                    value={selectedDrinkId}
                    onChange={(e) => {
                      setSelectedDrinkId(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    className="cafe-input appearance-none pr-10 cursor-pointer bg-white"
                    required
                  >
                    <option value="">-- 음료를 선택해주세요 --</option>
                    {DRINK_LIST.map((drink) => (
                      <option key={drink.id} value={drink.id}>
                        {drink.name} - {drink.price.toLocaleString('ko-KR')}원
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#6b4226]">
                    <span className="text-xs">▼</span>
                  </div>
                </div>
              </div>

              {/* 4. 사이즈 (라디오 버튼, 가로 배치) */}
              <div>
                <span className="block text-sm font-semibold text-[#54331d] mb-2">
                  사이즈 선택
                </span>
                <div className="flex flex-wrap items-center gap-4 sm:gap-6 pt-0.5">
                  {SIZE_LIST.map((size) => {
                    const radioId = `size-radio-${size.id}`;
                    return (
                      <label 
                        key={size.id} 
                        htmlFor={radioId}
                        className="inline-flex items-center gap-2 cursor-pointer text-sm text-[#4a2e19] select-none hover:text-[#6b4226]"
                      >
                        <input
                          id={radioId}
                          type="radio"
                          name="coffee-size"
                          value={size.id}
                          checked={selectedSize === size.id}
                          onChange={() => setSelectedSize(size.id)}
                          className="cafe-accent-input w-4 h-4 cursor-pointer"
                        />
                        <span>
                          <strong className="font-semibold">{size.id}</strong>{' '}
                          <span className="text-xs text-[#8c674b]">
                            (+{size.extraPrice.toLocaleString('ko-KR')}원)
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* 5. 추가 옵션 (체크박스, 가로 배치) */}
              <div>
                <span className="block text-sm font-semibold text-[#54331d] mb-2">
                  추가 옵션
                </span>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5 pt-0.5">
                  {OPTION_LIST.map((opt) => {
                    const checkId = `option-check-${opt.id}`;
                    const isChecked = selectedOptions.includes(opt.id);
                    return (
                      <label 
                        key={opt.id} 
                        htmlFor={checkId}
                        className="inline-flex items-center gap-2 cursor-pointer text-sm text-[#4a2e19] select-none hover:text-[#6b4226]"
                      >
                        <input
                          id={checkId}
                          type="checkbox"
                          value={opt.id}
                          checked={isChecked}
                          onChange={() => handleOptionChange(opt.id)}
                          className="cafe-accent-input w-4 h-4 rounded cursor-pointer"
                        />
                        <span>
                          {opt.name}{' '}
                          <span className="text-xs text-[#8c674b]">
                            (+{opt.price.toLocaleString('ko-KR')}원)
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* 6. 수량 (number 타입, 최소 1, 최대 10, 기본값 1) */}
              <div>
                <label 
                  htmlFor={quantityInputId} 
                  className="block text-sm font-semibold text-[#54331d] mb-1.5"
                >
                  수량
                </label>
                <div className="flex items-center gap-3">
                  <input
                    id={quantityInputId}
                    type="number"
                    min="1"
                    max="10"
                    value={quantity}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (isNaN(val)) {
                        setQuantity(1);
                      } else {
                        // 1과 10 사이로 제한
                        setQuantity(Math.min(10, Math.max(1, val)));
                      }
                    }}
                    className="cafe-input max-w-[120px]"
                  />
                  <span className="text-sm text-[#7d5639]">
                    잔 (최소 1잔 ~ 최대 10잔)
                  </span>
                </div>
              </div>

              {/* 7. 요청사항 (textarea) */}
              <div>
                <label 
                  htmlFor={notesTextareaId} 
                  className="block text-sm font-semibold text-[#54331d] mb-1.5"
                >
                  요청사항
                </label>
                <textarea
                  id={notesTextareaId}
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="예: 덜 달게 해주세요, 얼음 적게 넣어주세요 등"
                  className="cafe-input resize-none"
                />
              </div>

              {/* 유효성 검사 에러 알림 배너 */}
              {errorMessage && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
                  <AlertCircle className="w-5 h-5 shrink-0 text-red-600" />
                  <span className="font-medium">{errorMessage}</span>
                </div>
              )}

              {/* ======================================================= */}
              {/* 예상 금액: 큰 글씨(24px), 갈색(#6b4226), 굵게, 가운데 정렬 */}
              {/* 주문하기 버튼 바로 위에 배치 */}
              {/* ======================================================= */}
              <div className="pt-3 pb-1 text-center border-t border-[#f0e7df]">
                <div className="text-sm text-[#8c674b] mb-1 font-medium">
                  실시간 계산 금액
                </div>
                <div 
                  className="text-[24px] font-bold text-[#6b4226] tracking-tight tabular-nums"
                  aria-live="polite"
                >
                  예상 금액: {estimatedTotalPrice.toLocaleString('ko-KR')}원
                </div>
              </div>

              {/* 8. 주문하기 버튼 & 9. 다시 작성 버튼 */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                {/* 주문하기 버튼 */}
                <button
                  type="submit"
                  className="cafe-btn-primary flex-1 py-3 px-5 text-base shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Coffee className="w-5 h-5" />
                  <span>주문하기</span>
                </button>

                {/* 다시 작성 버튼 */}
                <button
                  type="button"
                  onClick={handleReset}
                  className="py-3 px-5 text-sm font-semibold text-[#6b4226] bg-[#f5ede4] hover:bg-[#ede0d4] rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>다시 작성</span>
                </button>
              </div>

            </form>

            {/* ======================================================= */}
            {/* [주문 확인 메시지] 연두색 배경, 초록 글씨, 둥근 모서리 */}
            {/* 고객 전용 깔끔한 영수증 안내 메시지만 표시 */}
            {/* ======================================================= */}
            {confirmationMessage && (
              <div className="mt-6 cafe-success-msg">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 shrink-0 text-[#2e7d32] mt-0.5" />
                  <div className="space-y-1 flex-1">
                    <p className="text-sm sm:text-base font-semibold leading-relaxed">
                      {confirmationMessage}
                    </p>
                    <p className="text-xs text-[#2e7d32]/80 pt-1">
                      맛있게 준비해 드리겠습니다. 잠시만 기다려주세요!
                    </p>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* 푸터 영역 (사장님 전용 장부 전환 링크 제공) */}
          <footer className="text-center text-xs text-[#a07e66] pb-8 pt-2 space-y-1.5">
            <p>© 바이브 카페 (Vibe Cafe). All rights reserved.</p>
            <div>
              <button
                type="button"
                onClick={() => setCurrentView('admin')}
                className="inline-flex items-center gap-1 text-[11px] text-[#8c674b] hover:text-[#6b4226] underline underline-offset-2 cursor-pointer"
              >
                <Settings className="w-3 h-3" />
                <span>사장님 전용 주문 관리 & 엑셀 장부 열기</span>
              </button>
            </div>
          </footer>

        </div>
      )}

      {/* ========================================================= */}
      {/* 2. [사장님 전용 엑셀 장부 & 주문 관리 화면] (완전 분리된 독립 뷰) */}
      {/* ========================================================= */}
      {currentView === 'admin' && (
        <div className="w-full max-w-3xl mx-auto space-y-6">
          
          {/* 상단 헤더 및 뒤로가기 */}
          <div className="flex items-center justify-between pb-2 border-b border-[#e5d8cc]">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setCurrentView('order')}
                className="p-2 bg-white hover:bg-[#ede0d4] text-[#6b4226] border border-[#d4c3b3] rounded-xl transition-colors cursor-pointer shadow-sm"
                title="주문 화면으로 돌아가기"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h2 className="text-xl font-bold text-[#6b4226] flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5" />
                  <span>주문 관리 대장 & 개인 엑셀</span>
                </h2>
                <p className="text-xs text-[#8c674b]">
                  접수된 고객 주문 내역을 확인하고 개인 엑셀(.xlsx) 파일로 내보내어 정리할 수 있습니다.
                </p>
              </div>
            </div>

            {/* 엑셀 파일 다운로드 버튼 */}
            <button
              type="button"
              onClick={handleExportAllToExcel}
              disabled={orderHistory.length === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#2e7d32] hover:bg-[#256828] disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-xl shadow-sm transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>엑셀(.xlsx) 파일 다운로드</span>
            </button>
          </div>

          {/* 매출 및 통계 요약 카드 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white p-4 rounded-xl border border-[#ede3da] shadow-sm">
              <span className="text-xs text-[#8c674b] font-medium">누적 주문 건수</span>
              <div className="text-2xl font-bold text-[#6b4226] mt-1 tabular-nums">
                {orderHistory.length}건
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-[#ede3da] shadow-sm">
              <span className="text-xs text-[#8c674b] font-medium">총 누적 매출</span>
              <div className="text-2xl font-bold text-[#2e7d32] mt-1 tabular-nums">
                {totalRevenue.toLocaleString('ko-KR')}원
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-[#ede3da] shadow-sm">
              <span className="text-xs text-[#8c674b] font-medium">평균 주문 금액</span>
              <div className="text-2xl font-bold text-[#6b4226] mt-1 tabular-nums">
                {orderHistory.length > 0
                  ? Math.round(totalRevenue / orderHistory.length).toLocaleString('ko-KR')
                  : 0}원
              </div>
            </div>
          </div>

          {/* 주문 목록 테이블 카드 */}
          <div className="bg-white rounded-2xl p-5 shadow-[0_4px_20px_rgba(107,66,38,0.06)] border border-[#ede3da] space-y-4">
            
            {/* 검색 및 제어 바 */}
            <div className="flex flex-col sm:flex-row gap-2 justify-between items-stretch sm:items-center">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-3.5 h-3.5 text-[#9e7a60] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  placeholder="주문자명, 음료명, 연락처, 주문번호 검색"
                  className="w-full pl-8 pr-3 py-2 text-xs bg-[#faf6f0] border border-[#e5d8cc] rounded-lg text-[#3d2616] focus:outline-none focus:border-[#6b4226]"
                />
              </div>

              {orderHistory.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleClearAllOrders}
                    className="inline-flex items-center gap-1 px-3 py-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>장부 전체 비우기</span>
                  </button>
                </div>
              )}
            </div>

            {/* 테이블 본문 */}
            {orderHistory.length === 0 ? (
              <div className="text-center py-12 text-[#9e7a60] space-y-2">
                <ReceiptText className="w-10 h-10 mx-auto text-[#cbbaa8] opacity-60" />
                <p className="text-sm font-semibold">아직 접수된 주문 내역이 없습니다.</p>
                <p className="text-xs text-[#b39b88]">고객이 주문을 완료하면 이 장부에 실시간으로 기록됩니다.</p>
                <button
                  type="button"
                  onClick={() => setCurrentView('order')}
                  className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-[#6b4226] text-white rounded-lg hover:bg-[#825230] transition-colors cursor-pointer"
                >
                  <Coffee className="w-3.5 h-3.5" />
                  <span>주문 테스트하러 가기</span>
                </button>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-10 text-[#9e7a60] text-xs">
                검색어와 일치하는 주문 내역이 없습니다.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-[#ebdcd0]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#faf6f0] text-[#6b4226] border-b border-[#ebdcd0]">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold">주문번호 / 일시</th>
                      <th className="py-2.5 px-3 font-semibold">주문자(연락처)</th>
                      <th className="py-2.5 px-3 font-semibold">음료 및 옵션</th>
                      <th className="py-2.5 px-3 font-semibold text-center">수량</th>
                      <th className="py-2.5 px-3 font-semibold text-right">총 결제금액</th>
                      <th className="py-2.5 px-3 font-semibold">요청사항</th>
                      <th className="py-2.5 px-3 font-semibold text-center">관리</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f5ebe1]">
                    {filteredOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-[#fdfbf9] transition-colors">
                        <td className="py-3 px-3 align-top whitespace-nowrap">
                          <span className="font-mono text-[11px] text-[#6b4226] font-semibold">{order.id}</span>
                          <div className="text-[10px] text-[#a08571] mt-0.5">{order.orderDate}</div>
                        </td>
                        <td className="py-3 px-3 align-top whitespace-nowrap">
                          <div className="font-semibold text-[#3d2616]">{order.name}</div>
                          <div className="text-[11px] text-[#8c674b]">{order.phone || '미입력'}</div>
                        </td>
                        <td className="py-3 px-3 align-top">
                          <div className="font-medium text-[#4a2e19]">
                            {order.drinkName} <span className="text-[11px] text-[#8c674b]">({order.size})</span>
                          </div>
                          {order.options.length > 0 && (
                            <div className="text-[11px] text-[#8c674b] mt-0.5">
                              + {order.options.join(', ')}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 align-top text-center font-semibold text-[#4a2e19]">
                          {order.quantity}잔
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-[#6b4226] align-top tabular-nums whitespace-nowrap">
                          {order.totalPrice.toLocaleString('ko-KR')}원
                        </td>
                        <td className="py-3 px-3 align-top text-[#7d5639] max-w-[180px]">
                          {order.notes ? (
                            <span className="text-[11px] italic bg-[#faf6f0] px-1.5 py-0.5 rounded border border-[#ebdcd0] block truncate">
                              &quot;{order.notes}&quot;
                            </span>
                          ) : (
                            <span className="text-[11px] text-gray-400">-</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center align-top whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => exportSingleOrderToExcel(order)}
                              className="p-1 text-[#2e7d32] hover:bg-emerald-50 rounded transition-colors"
                              title="이 주문만 엑셀로 저장"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteOrder(order.id)}
                              className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                              title="삭제"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 안내 배너 */}
            <div className="bg-[#faf6f0] p-3 rounded-xl border border-[#ebdcd0] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[#7d5639]">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-[#2e7d32]" />
                <span>엑셀 파일 포맷: <strong>Microsoft Excel (.xlsx)</strong> — 주문번호, 고객명, 음료, 금액, 요청사항 자동 정리</span>
              </div>
              <button
                type="button"
                onClick={handleExportAllToExcel}
                disabled={orderHistory.length === 0}
                className="self-end sm:self-auto text-xs font-semibold text-[#2e7d32] hover:underline disabled:text-gray-400 cursor-pointer"
              >
                전체 대장 다운로드 →
              </button>
            </div>

          </div>

          {/* 뒤로가기 버튼 */}
          <div className="text-center pt-2 pb-8">
            <button
              type="button"
              onClick={() => setCurrentView('order')}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-white text-[#6b4226] border border-[#d4c3b3] hover:bg-[#faf6f0] rounded-xl text-xs font-semibold shadow-sm transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>고객 주문 화면으로 돌아가기</span>
            </button>
          </div>

        </div>
      )}

    </div>
  );
}
