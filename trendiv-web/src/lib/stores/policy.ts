const H4_STYLE =
	'first:mt-0 my-4 text-base font-bold text-gray-800 border-l-4 border-blue-500 pl-2';
const P_STYLE = 'mb-2 text-gray-600 leading-relaxed text-sm';
const UL_STYLE = 'list-disc pl-5 mb-4 text-gray-600 text-sm';

export const TERMS_TEXT = `
<div>
    <h4 class="${H4_STYLE}">제 1 조 (목적)</h4>
    <p class="${P_STYLE}">
        본 약관은 <strong>Trendiv</strong>(이하 "서비스")가 제공하는 트렌드 분석 및 관련 제반 서비스의 이용과 관련하여, 
        서비스와 이용자의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.
    </p>

    <h4 class="${H4_STYLE}">제 2 조 (서비스의 제공)</h4>
    <p class="${P_STYLE}">
        1. 본 서비스는 인터넷상의 다양한 트렌드 정보를 수집, 분석하여 시각화된 데이터를 제공합니다.<br>
        2. 서비스는 운영상, 기술상의 필요에 따라 제공하는 기능의 일부 또는 전부를 수정하거나 중단할 수 있습니다.
    </p>

    <h4 class="${H4_STYLE}">제 3 조 (회원 가입 및 계정)</h4>
    <p class="${P_STYLE}">
        1. 이용자는 구글(Google) 소셜 로그인을 통해 간편하게 회원가입 및 로그인을 할 수 있습니다.<br>
        2. 회원은 본인의 계정 정보가 타인에게 노출되지 않도록 관리할 책임이 있습니다.
    </p>

    <h4 class="${H4_STYLE}">제 4 조 (면책 조항)</h4>
    <p class="${P_STYLE}">
        본 서비스가 제공하는 분석 데이터는 참고용이며, 해당 정보의 정확성이나 신뢰성에 대해 서비스 제공자는 법적 책임을 지지 않습니다. 
        데이터 활용에 대한 최종 판단과 책임은 이용자 본인에게 있습니다.
    </p>
</div>
`;

export const PRIVACY_TEXT = `
<div>
    <h4 class="${H4_STYLE}">1. 수집하는 개인정보 항목</h4>
    <p class="${P_STYLE}">
        서비스는 회원가입 및 원활한 서비스 이용을 위해 구글(Google) 연동을 통해 아래의 정보를 수집합니다.
    </p>
    <ul class="${UL_STYLE}">
        <li>필수 항목: 이메일 주소, 이름(닉네임), 프로필 사진 URL</li>
    </ul>

    <h4 class="${H4_STYLE}">2. 개인정보의 수집 및 이용 목적</h4>
    <p class="${P_STYLE}">
        수집한 개인정보는 다음의 목적을 위해 활용합니다.
    </p>
    <ul class="${UL_STYLE}">
        <li>회원 식별 및 로그인 처리</li>
        <li>서비스 이용 기록 관리 및 맞춤형 트렌드 리포트 제공</li>
        <li>부정 이용 방지 및 서비스 관련 공지사항 전달</li>
    </ul>

    <h4 class="${H4_STYLE}">3. 개인정보의 보유 및 이용 기간</h4>
    <p class="${P_STYLE}">
        이용자의 개인정보는 <strong>회원 탈퇴 시까지</strong> 보유 및 이용하며, 탈퇴 요청 시 해당 정보를 지체 없이 파기합니다. 
        단, 관계 법령에 의해 보존이 필요한 경우 해당 기간 동안 보관합니다.
    </p>

    <h4 class="${H4_STYLE}">4. 개인정보의 제3자 제공</h4>
    <p class="${P_STYLE}">
        서비스는 이용자의 동의 없이 개인정보를 외부에 제공하지 않습니다. 
        단, 로그인 인증 처리를 위해 구글(Google)의 인증 서버와 통신하는 과정은 예외로 합니다.
    </p>
</div>
`;
