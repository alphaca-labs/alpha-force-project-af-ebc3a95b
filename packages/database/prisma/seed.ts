/**
 * 운영 초기 데이터 시드.
 *
 * PRD 12.2 완료 조건이 이름으로 지목한 매물(반포자이·은마아파트)을 포함해 추천 8개를 채우고,
 * 대출 규칙 4종과 최초 운영자 1명(SETUP_REQUIRED)을 만든다. 실거래는 시세 산정이 실제로
 * 도는지 확인할 수 있는 최소 표본을 평형마다 넣는다.
 *
 * 재실행 가능하다: 모든 upsert 는 자연키(코드·이름+주소·외부 거래 ID) 기준이다.
 */
import type { HousingType, LoanKind } from "../generated/prisma/enums";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../generated/prisma/client";
import { hashPassword } from "@repo/security";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL 이 필요합니다.");
  process.exit(1);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg(new Pool({ connectionString: url })),
});

type SeedProperty = {
  name: string;
  address: string;
  region: string;
  type: HousingType;
  featuredOrder: number | null;
  areas: number[];
  base: number;
};

const PROPERTIES: SeedProperty[] = [
  {
    name: "반포자이",
    address: "서울특별시 서초구 신반포로 270",
    region: "서울 서초구",
    type: "APARTMENT",
    featuredOrder: 1,
    areas: [59, 84, 132],
    base: 3_200_000_000,
  },
  {
    name: "은마아파트",
    address: "서울특별시 강남구 삼성로 212",
    region: "서울 강남구",
    type: "APARTMENT",
    featuredOrder: 2,
    areas: [76, 84],
    base: 2_600_000_000,
  },
  {
    name: "헬리오시티",
    address: "서울특별시 송파구 송파대로 345",
    region: "서울 송파구",
    type: "APARTMENT",
    featuredOrder: 3,
    areas: [59, 84, 110],
    base: 2_100_000_000,
  },
  {
    name: "마포래미안푸르지오",
    address: "서울특별시 마포구 백범로 195",
    region: "서울 마포구",
    type: "APARTMENT",
    featuredOrder: 4,
    areas: [59, 84],
    base: 1_650_000_000,
  },
  {
    name: "래미안위브",
    address: "인천광역시 부평구 부평대로 168",
    region: "인천 부평구",
    type: "APARTMENT",
    featuredOrder: 5,
    areas: [59, 84],
    base: 620_000_000,
  },
  {
    name: "광교센트럴타운",
    address: "경기도 수원시 영통구 광교중앙로 145",
    region: "경기 수원시",
    type: "APARTMENT",
    featuredOrder: 6,
    areas: [74, 84],
    base: 980_000_000,
  },
  {
    name: "부산해운대아이파크",
    address: "부산광역시 해운대구 마린시티2로 33",
    region: "부산 해운대구",
    type: "APARTMENT",
    featuredOrder: 7,
    areas: [84, 126],
    base: 1_450_000_000,
  },
  {
    name: "강남역센트럴푸르지오시티",
    address: "서울특별시 강남구 강남대로 320",
    region: "서울 강남구",
    type: "OFFICETEL",
    featuredOrder: 8,
    areas: [24, 33],
    base: 430_000_000,
  },
  // 추천에는 없지만 검색으로만 닿는 단지 — 「추천 최대 8개」 규칙이 실제로 걸리는지 확인용.
  {
    name: "대구범어라온프라이빗",
    address: "대구광역시 수성구 달구벌대로 2450",
    region: "대구 수성구",
    type: "APARTMENT",
    featuredOrder: null,
    areas: [84],
    base: 890_000_000,
  },
  // 시세 확인 불가 상태를 실제로 만들기 위해 거래를 넣지 않는 평형이 있는 단지.
  {
    name: "세종호수공원파크",
    address: "세종특별자치시 한누리대로 2130",
    region: "세종시",
    type: "APARTMENT",
    featuredOrder: null,
    areas: [59, 101],
    base: 720_000_000,
  },
];

type SeedLoanProduct = {
  code: string;
  name: string;
  kind: LoanKind;
  exclusiveGroup: string;
  officialSource: string;
  version: {
    ltv: number;
    dsr: number;
    annualRateMin: number;
    annualRateMax: number;
    termYears: number;
    maxAmount: number;
    conditions: Record<string, unknown>[];
    preparations: string[];
  };
};

const LOAN_PRODUCTS: SeedLoanProduct[] = [
  {
    code: "GENERAL_MORTGAGE",
    name: "일반 주택담보대출",
    kind: "GENERAL",
    exclusiveGroup: "MORTGAGE",
    officialSource: "금융위원회 · 각 금융기관 창구",
    version: {
      ltv: 0.7,
      dsr: 0.4,
      annualRateMin: 0.038,
      annualRateMax: 0.048,
      termYears: 30,
      maxAmount: 1_000_000_000,
      conditions: [],
      preparations: ["소득 증빙 서류", "주택 등기부등본", "금융기관 사전 상담"],
    },
  },
  {
    code: "DIDIMDOL",
    name: "디딤돌대출",
    kind: "GOVERNMENT",
    exclusiveGroup: "MORTGAGE",
    officialSource: "주택도시기금 (nhuf.molit.go.kr)",
    version: {
      ltv: 0.7,
      dsr: 0.6,
      annualRateMin: 0.025,
      annualRateMax: 0.035,
      termYears: 30,
      maxAmount: 250_000_000,
      conditions: [
        { kind: "NO_HOME", label: "무주택 세대주" },
        {
          kind: "MAX_ANNUAL_INCOME",
          label: "부부합산 연소득 6천만원 이하",
          value: 60_000_000,
        },
        {
          kind: "MAX_PRICE",
          label: "주택 가격 5억원 이하",
          value: 500_000_000,
        },
      ],
      preparations: [
        "주민등록등본",
        "가족관계증명서",
        "소득금액증명원",
        "주택도시기금 수탁은행 상담",
      ],
    },
  },
  {
    code: "BOGEUMJARI",
    name: "보금자리론",
    kind: "GOVERNMENT",
    exclusiveGroup: "MORTGAGE",
    officialSource: "한국주택금융공사 (hf.go.kr)",
    version: {
      ltv: 0.7,
      dsr: 0.6,
      annualRateMin: 0.033,
      annualRateMax: 0.042,
      termYears: 40,
      maxAmount: 360_000_000,
      conditions: [
        { kind: "NO_HOME", label: "무주택 세대" },
        {
          kind: "MAX_ANNUAL_INCOME",
          label: "부부합산 연소득 7천만원 이하",
          value: 70_000_000,
        },
        {
          kind: "MAX_PRICE",
          label: "주택 가격 6억원 이하",
          value: 600_000_000,
        },
      ],
      preparations: [
        "무주택 확인서",
        "소득 증빙 서류",
        "한국주택금융공사 신청",
      ],
    },
  },
  {
    code: "NEWLYWED_SPECIAL",
    name: "신혼부부 전용 구입자금",
    kind: "GOVERNMENT",
    exclusiveGroup: "POLICY_ADDON",
    officialSource: "주택도시기금 (nhuf.molit.go.kr)",
    version: {
      ltv: 0.2,
      dsr: 0.6,
      annualRateMin: 0.021,
      annualRateMax: 0.031,
      termYears: 30,
      maxAmount: 100_000_000,
      conditions: [
        { kind: "NO_HOME", label: "무주택 세대" },
        { kind: "NEWLYWED_MONTHS", label: "혼인 7년 이내", value: 84 },
        {
          kind: "MAX_ANNUAL_INCOME",
          label: "부부합산 연소득 8천5백만원 이하",
          value: 85_000_000,
        },
        { kind: "MIN_HOUSEHOLD_SIZE", label: "가구원 2인 이상", value: 2 },
      ],
      preparations: ["혼인관계증명서", "주민등록등본", "소득 증빙 서류"],
    },
  },
];

const SUBSCRIPTION_RULES = [
  {
    code: "SPECIAL_FIRST_TIME",
    name: "생애최초 특별공급",
    officialSource: "청약홈 (applyhome.co.kr)",
    conditions: [
      { kind: "NO_HOME", label: "무주택 세대구성원" },
      { kind: "FIRST_TIME", label: "생애 최초 주택 구입" },
      {
        kind: "MAX_ANNUAL_INCOME",
        label: "도시근로자 월평균 소득 기준 이하",
        value: 90_000_000,
      },
    ],
    preparations: [
      "청약통장 가입 기간 확인",
      "무주택 기간 확인",
      "청약홈 자격 조회",
    ],
  },
  {
    code: "SPECIAL_NEWLYWED",
    name: "신혼부부 특별공급",
    officialSource: "청약홈 (applyhome.co.kr)",
    conditions: [
      { kind: "NO_HOME", label: "무주택 세대구성원" },
      { kind: "NEWLYWED_MONTHS", label: "혼인 7년 이내", value: 84 },
      { kind: "MIN_HOUSEHOLD_SIZE", label: "가구원 2인 이상", value: 2 },
    ],
    preparations: ["혼인관계증명서", "청약통장 확인", "청약홈 자격 조회"],
  },
];

function isoDate(d: Date) {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
}

async function main() {
  const now = new Date();

  // --- 운영자 ------------------------------------------------------------
  const ownerEmail = process.env.SEED_ADMIN_EMAIL ?? "owner@zipsanya.local";
  const ownerPassword =
    process.env.SEED_ADMIN_PASSWORD ?? "zipsanya-initial-owner-2026";
  const owner = await prisma.adminAccount.upsert({
    where: { email: ownerEmail },
    update: {},
    create: {
      email: ownerEmail,
      name: "초기 운영자",
      passwordHash: await hashPassword(ownerPassword),
      role: "OWNER",
      // 최초 로그인에서 비밀번호 교체 + TOTP 등록을 강제한다(FR-036).
      status: "SETUP_REQUIRED",
    },
  });

  // --- 매물·평형·실거래·시세 ---------------------------------------------
  let areaCount = 0;
  let txCount = 0;
  for (const p of PROPERTIES) {
    const property = await prisma.property.upsert({
      where: { name_address: { name: p.name, address: p.address } },
      update: {
        region: p.region,
        type: p.type,
        featured: p.featuredOrder !== null,
        featuredOrder: p.featuredOrder,
      },
      create: {
        name: p.name,
        address: p.address,
        region: p.region,
        type: p.type,
        featured: p.featuredOrder !== null,
        featuredOrder: p.featuredOrder,
      },
    });

    for (const [index, m2] of p.areas.entries()) {
      const area = await prisma.propertyArea.upsert({
        where: { propertyId_areaM2: { propertyId: property.id, areaM2: m2 } },
        update: {},
        create: {
          propertyId: property.id,
          areaM2: m2,
          pyeong: Math.round(m2 / 3.3058),
        },
      });
      areaCount += 1;

      // 세종호수공원파크 101㎡ 는 「시세 확인 불가」 경로를 실제로 재현하기 위해 거래를 넣지 않는다.
      if (p.name === "세종호수공원파크" && m2 === 101) continue;

      const scale = 1 + index * 0.35;
      for (let k = 0; k < 5; k += 1) {
        const contract = new Date(now);
        contract.setUTCMonth(contract.getUTCMonth() - k);
        const amount = BigInt(
          Math.round((p.base * scale * (1 + (k % 3) * 0.015)) / 1_000_000) *
            1_000_000,
        );
        const externalId = `SEED-${property.id}-${m2}-${k}`;
        await prisma.realEstateTransaction.upsert({
          where: { externalId },
          update: { amount, cancelled: false },
          create: {
            externalId,
            areaId: area.id,
            amount,
            contractDate: isoDate(contract),
            cancelled: false,
            sourceAt: now,
          },
        });
        txCount += 1;
      }
      // 취소 거래 1건 — 시세 계산에서 실제로 빠지는지 확인할 수 있게 둔다.
      const cancelledId = `SEED-${property.id}-${m2}-cancelled`;
      await prisma.realEstateTransaction.upsert({
        where: { externalId: cancelledId },
        update: { cancelled: true },
        create: {
          externalId: cancelledId,
          areaId: area.id,
          amount: BigInt(p.base * 9),
          contractDate: isoDate(now),
          cancelled: true,
          sourceAt: now,
        },
      });
      txCount += 1;
    }
  }

  // 운영자 확정 시세 1건 — override 우선 경로를 실제로 재현한다.
  const eunma84 = await prisma.propertyArea.findFirst({
    where: { areaM2: 84, property: { name: "은마아파트" } },
  });
  if (eunma84) {
    const existing = await prisma.adminPriceOverride.findFirst({
      where: { areaId: eunma84.id },
    });
    if (!existing) {
      await prisma.adminPriceOverride.create({
        data: {
          areaId: eunma84.id,
          price: 2_780_000_000n,
          baseDate: isoDate(now),
          sourceLabel: "운영자 확정 — 현장 시세 확인",
          effectiveFrom: isoDate(now),
          status: "ACTIVE",
          memo: "재건축 진행 반영",
          createdById: owner.id,
        },
      });
    }
  }

  // --- 대출 · 청약 규칙 ---------------------------------------------------
  for (const p of LOAN_PRODUCTS) {
    const product = await prisma.loanProduct.upsert({
      where: { code: p.code },
      update: {
        name: p.name,
        kind: p.kind,
        exclusiveGroup: p.exclusiveGroup,
        officialSource: p.officialSource,
      },
      create: {
        code: p.code,
        name: p.name,
        kind: p.kind,
        exclusiveGroup: p.exclusiveGroup,
        officialSource: p.officialSource,
      },
    });
    const v = p.version;
    await prisma.loanRuleVersion.upsert({
      where: { productId_version: { productId: product.id, version: 1 } },
      update: {},
      create: {
        productId: product.id,
        version: 1,
        ltv: v.ltv,
        dsr: v.dsr,
        annualRateMin: v.annualRateMin,
        annualRateMax: v.annualRateMax,
        termYears: v.termYears,
        maxAmount: BigInt(v.maxAmount),
        // Prisma 의 `InputJsonValue` 는 색인 시그니처를 요구한다. 값 자체는 위 `SeedLoanProduct`
        // 가 이미 좁혀 뒀으므로 저장 경계에서만 형식을 맞춘다.
        conditions: v.conditions as never,
        preparations: v.preparations as never,
        effectiveFrom: new Date(Date.UTC(2026, 0, 1)),
        status: "ACTIVE",
        createdById: owner.id,
      },
    });
  }

  for (const r of SUBSCRIPTION_RULES) {
    await prisma.subscriptionRuleVersion.upsert({
      where: { code_version: { code: r.code, version: 1 } },
      update: {},
      create: {
        code: r.code,
        name: r.name,
        version: 1,
        conditions: r.conditions,
        preparations: r.preparations,
        officialSource: r.officialSource,
        effectiveFrom: new Date(Date.UTC(2026, 0, 1)),
        status: "ACTIVE",
        createdById: owner.id,
      },
    });
  }

  console.log(
    `seed 완료 — 매물 ${PROPERTIES.length} · 평형 ${areaCount} · 실거래 ${txCount} · 대출상품 ${LOAN_PRODUCTS.length} · 청약규칙 ${SUBSCRIPTION_RULES.length} · 운영자 ${ownerEmail}`,
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
