import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

type LegalPage = {
  title: string;
  eyebrow: string;
  summary: string;
  sections: Array<{ title: string; paragraphs: string[]; bullets?: string[] }>;
};

const pages: Record<string, LegalPage> = {
  terms: {
    title: 'Điều khoản sử dụng',
    eyebrow: 'Terms of Use',
    summary: 'Các điều kiện áp dụng khi bạn tạo tài khoản và sử dụng Upgen.',
    sections: [
      { title: '1. Chấp thuận điều khoản', paragraphs: ['Khi tạo tài khoản hoặc tiếp tục sử dụng Upgen, bạn xác nhận đã đọc và đồng ý với các điều khoản này. Nếu sử dụng thay mặt tổ chức, bạn xác nhận mình có thẩm quyền chấp thuận thay tổ chức đó.'] },
      { title: '2. Tài khoản và bảo mật', paragraphs: ['Bạn chịu trách nhiệm cung cấp thông tin chính xác, bảo vệ thông tin đăng nhập và thông báo khi nghi ngờ tài khoản bị truy cập trái phép. Không chia sẻ tài khoản theo cách làm suy yếu kiểm soát truy cập của workspace.'] },
      { title: '3. Sử dụng được phép', paragraphs: ['Bạn được dùng Upgen để quản lý công việc và dữ liệu hợp pháp của cá nhân hoặc tổ chức.'], bullets: ['Không phát tán mã độc, nội dung trái pháp luật hoặc xâm phạm quyền của người khác.', 'Không dò quét, phá hoại, vượt giới hạn truy cập hoặc gây quá tải dịch vụ.', 'Không sử dụng AI để tạo nội dung gây hại hoặc đưa ra quyết định rủi ro cao mà không có con người kiểm tra.'] },
      { title: '4. Dữ liệu của bạn', paragraphs: ['Bạn giữ quyền sở hữu nội dung đưa vào Upgen. Bạn cho phép hệ thống xử lý nội dung trong phạm vi cần thiết để cung cấp các chức năng đã chọn, bao gồm đồng bộ, tìm kiếm, cộng tác và AI. Bạn có trách nhiệm có quyền hợp pháp đối với dữ liệu mình tải lên.'] },
      { title: '5. Gói dịch vụ và thanh toán', paragraphs: ['Thông tin giá hiển thị tại thời điểm checkout là giá áp dụng. Gói trả phí được PayOS xử lý dưới dạng trả trước theo chu kỳ đã chọn và không tự động gia hạn. Quyền lợi, thuế và thời hạn hoàn tiền (nếu có) phải được xác nhận trên trang thanh toán trước khi mua.'] },
      { title: '6. Tính khả dụng và thay đổi', paragraphs: ['Chúng tôi có thể cập nhật tính năng để cải thiện bảo mật, hiệu năng hoặc trải nghiệm. Dịch vụ có thể gián đoạn trong thời gian bảo trì hoặc do sự cố ngoài khả năng kiểm soát; mọi cam kết SLA riêng chỉ có hiệu lực khi được ký bằng văn bản.'] },
      { title: '7. Chấm dứt', paragraphs: ['Bạn có thể ngừng sử dụng dịch vụ bất kỳ lúc nào. Chúng tôi có thể hạn chế tài khoản vi phạm nghiêm trọng điều khoản, gây rủi ro bảo mật hoặc theo yêu cầu pháp luật, đồng thời cố gắng thông báo khi phù hợp.'] },
      { title: '8. Liên hệ', paragraphs: ['Các yêu cầu pháp lý hoặc hỗ trợ có thể gửi qua kênh liên hệ được công bố trong ứng dụng. Phiên bản cập nhật: 20/08/2026.'] },
    ],
  },
  privacy: {
    title: 'Chính sách quyền riêng tư',
    eyebrow: 'Privacy Policy',
    summary: 'Cách Upgen thu thập, sử dụng và bảo vệ dữ liệu khi bạn dùng ứng dụng.',
    sections: [
      { title: '1. Dữ liệu được xử lý', paragraphs: ['Upgen có thể xử lý thông tin tài khoản (tên, email, ảnh đại diện), nội dung workspace, dữ liệu cộng tác, cấu hình ứng dụng, dữ liệu thanh toán do nhà cung cấp trả về và thông tin kỹ thuật cần thiết để vận hành dịch vụ. Chúng tôi không lưu toàn bộ số thẻ thanh toán.'] },
      { title: '2. Mục đích sử dụng', paragraphs: ['Dữ liệu được dùng để xác thực, đồng bộ, cung cấp tính năng cộng tác, hỗ trợ khách hàng, ngăn chặn gian lận, xử lý thanh toán và cải thiện độ ổn định. Nội dung chỉ được gửi tới nhà cung cấp AI khi bạn chủ động gọi tính năng AI.'] },
      { title: '3. Local-first và lưu trữ trên thiết bị', paragraphs: ['Một phần dữ liệu và tùy chọn có thể được lưu trong bộ nhớ trình duyệt để ứng dụng hoạt động nhanh hoặc ngoại tuyến. Người có quyền truy cập thiết bị và hồ sơ trình duyệt có thể tiếp cận dữ liệu cục bộ; hãy khóa thiết bị và đăng xuất trên máy dùng chung.'] },
      { title: '4. Nhà cung cấp dịch vụ', paragraphs: ['Upgen sử dụng nhà cung cấp hạ tầng và tính năng như dịch vụ cơ sở dữ liệu/xác thực đám mây Cloud, PayOS cho thanh toán và Google Gemini cho yêu cầu AI. Mỗi nhà cung cấp xử lý dữ liệu theo điều khoản và cấu hình áp dụng của họ.'] },
      { title: '5. Chia sẻ và chuyển giao', paragraphs: ['Chúng tôi không bán dữ liệu cá nhân. Dữ liệu chỉ được chia sẻ với nhà cung cấp cần thiết, theo yêu cầu pháp luật, để bảo vệ quyền hợp pháp hoặc trong giao dịch tổ chức có biện pháp bảo vệ phù hợp.'] },
      { title: '6. Lưu giữ và xóa dữ liệu', paragraphs: ['Dữ liệu được giữ trong thời gian tài khoản hoạt động hoặc khi cần cho mục đích hợp pháp. Bạn có thể dùng chức năng xuất/xóa trong ứng dụng; bản sao lưu và hồ sơ giao dịch có thể tồn tại thêm một khoảng thời gian giới hạn theo yêu cầu vận hành hoặc pháp luật.'] },
      { title: '7. Quyền và lựa chọn', paragraphs: ['Tùy nơi cư trú, bạn có thể yêu cầu truy cập, chỉnh sửa, xuất, xóa hoặc hạn chế xử lý dữ liệu. Quản trị viên workspace có thể kiểm soát dữ liệu tổ chức và thành viên.'] },
      { title: '8. Liên hệ', paragraphs: ['Gửi yêu cầu quyền riêng tư qua kênh hỗ trợ trong ứng dụng và nêu rõ email tài khoản/workspace liên quan. Phiên bản cập nhật: 20/08/2026.'] },
    ],
  },
  security: {
    title: 'Trung tâm bảo mật',
    eyebrow: 'Security Center',
    summary: 'Mô hình bảo vệ dữ liệu và phạm vi trách nhiệm khi triển khai Upgen.',
    sections: [
      { title: 'Kiểm soát đã triển khai', paragraphs: ['Upgen tách khóa công khai dùng trên trình duyệt và khóa bí mật chỉ dùng ở máy chủ. Dữ liệu nhiều tenant được bảo vệ bằng Row Level Security theo người dùng/workspace trong các migration đi kèm. API thanh toán xác thực access token trước khi truy cập PayOS; webhook có kiểm tra chữ ký, đối soát đơn/số tiền và idempotency.'], bullets: ['HTTPS/HSTS và các security header cơ bản ở lớp ứng dụng.', 'RLS và chính sách truy cập trên các bảng dữ liệu được expose.', 'Khóa dịch vụ, PayOS secret và Gemini server key không được đưa vào bundle client.', 'AI chỉ dùng khóa máy chủ sau khi xác thực phiên, gói trả phí và hạn mức; không nhận khóa Gemini cá nhân.'] },
      { title: 'Dữ liệu và nhà cung cấp', paragraphs: ['Dữ liệu cloud được lưu trên dự án cơ sở dữ liệu đám mây mà đơn vị triển khai cấu hình. Thanh toán đi qua PayOS. Yêu cầu AI được gửi tới Google Gemini khi người dùng kích hoạt. Chứng nhận của nhà cung cấp hạ tầng không tự động đồng nghĩa Upgen là một sản phẩm đã được chứng nhận độc lập.'] },
      { title: 'Trách nhiệm của khách hàng', paragraphs: ['Quản trị viên cần cấu hình đúng biến môi trường, URL OAuth, chính sách RLS, webhook PayOS và quyền thành viên trước khi production. Không dùng service-role key trong trình duyệt; không chia sẻ API key; bật MFA cho các tài khoản quản trị hạ tầng.'] },
      { title: 'Báo cáo lỗ hổng', paragraphs: ['Nếu phát hiện vấn đề bảo mật, không khai thác dữ liệu của người khác. Hãy ghi lại đường dẫn, tác động và bước tái hiện tối thiểu rồi gửi qua kênh hỗ trợ riêng của đơn vị vận hành. Chúng tôi ưu tiên xác nhận và xử lý theo mức độ ảnh hưởng.'] },
      { title: 'Trạng thái tuân thủ', paragraphs: ['Trang này mô tả biện pháp kỹ thuật hiện có, không phải chứng thư SOC 2, ISO 27001 hay cam kết SLA. Mọi yêu cầu tuân thủ hoặc SLA doanh nghiệp cần được thẩm định và ký kết riêng. Phiên bản cập nhật: 20/08/2026.'] },
    ],
  },
};

export function generateStaticParams() {
  return Object.keys(pages).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = pages[slug];
  if (!page) return {};
  return {
    title: page.title,
    description: page.summary,
    alternates: { canonical: `/legal/${slug}` },
  };
}

export default async function LegalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = pages[slug];
  if (!page) notFound();

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[var(--cu-bg)] dark:text-slate-100">
      <header className="border-b border-slate-200 bg-white/85 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/85">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/" className="flex items-center gap-2 text-xl font-black tracking-tight text-slate-900 dark:text-white">
            Upgen.
          </Link>
          <Link href="/" className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900">Quay lại ứng dụng</Link>
        </div>
      </header>

      <article className="mx-auto max-w-4xl px-5 py-12 sm:px-8 sm:py-20">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-600 dark:text-blue-400">{page.eyebrow}</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">{page.title}</h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-400">{page.summary}</p>

        <div className="mt-12 space-y-8">
          {page.sections.map((section) => (
            <section key={section.title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 sm:p-8">
              <h2 className="text-lg font-black">{section.title}</h2>
              <div className="mt-3 space-y-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
                {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                {section.bullets && (
                  <ul className="list-disc space-y-2 pl-5">
                    {section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
                  </ul>
                )}
              </div>
            </section>
          ))}
        </div>
      </article>
    </main>
  );
}
