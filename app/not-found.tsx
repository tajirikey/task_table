import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="view" style={{ textAlign: 'center', paddingTop: 80 }}>
      <p>ページが見つかりません</p>
      <Link href="/">トップへ戻る</Link>
    </div>
  )
}
