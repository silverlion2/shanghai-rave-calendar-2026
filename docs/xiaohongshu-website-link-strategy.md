# Xiaohongshu Website Link Strategy

Updated: 2026-06-18 Asia/Shanghai

Scope: Basement Dispatch / Shanghai Rave Index (`raveindexsh.top`)

## Decision

Normal Xiaohongshu profile bio URLs are not reliable clickable links on mobile. Treat the website URL as a brand/search cue, not as a button.

The working acquisition path should be:

```text
Useful Xiaohongshu note
-> "full calendar on profile / search the brand"
-> profile + pinned entry note
-> user types or searches raveindexsh.top / brand term
-> website
```

Do not build the Xiaohongshu strategy around raw external links in notes, comments, images, QR codes, or DMs. Those surfaces are higher-risk because Xiaohongshu actively governs off-platform diversion, especially where transactions, tickets, contacts, or private traffic are involved.

## How Others Usually Do It

1. **Native content first, website second**
   - The post itself gives a useful mini-answer: weekend picks, venue guide, sound guide, or "tonight" shortlist.
   - The website is framed as the complete archive/calendar, not the only place with value.

2. **A searchable brand term**
   - Repeat a stable name across title/body/profile so users can search it later.
   - Recommended terms:
     - `上海Rave日历`
     - `上海电子音乐日历`
     - `Basement Dispatch`
     - `Shanghai Rave Index`
     - `raveindexsh.top`

3. **Short domain as text**
   - Use `raveindexsh.top`.
   - Avoid long URLs, UTM strings, Vercel/Netlify preview links, or event-specific paths in Xiaohongshu copy.

4. **Pinned entry note**
   - One pinned note explains what the project is and where the full calendar lives.
   - Regular notes can say "full calendar on profile" without repeating the URL every time.

5. **Official commercial surfaces when needed**
   - If a clickable path becomes necessary, test professional/business account features, official lead tools, Xiaohongshu shop/product links, or official ad/landing-page flows.
   - Availability depends on account type, verification, category, and current platform rules.

6. **Gray tactics exist but should not be the main account strategy**
   - QR codes, split links, comment links, image watermarks, hidden keywords, "DM me for link", and small-account replies are common but risky.
   - Use only if intentionally testing throwaway accounts, not the primary brand account.

## Recommended Copy

### Profile Bio

```text
上海电子音乐周末日历
Techno / Rave / Warehouse / Bass
完整日历：raveindexsh.top
```

Alternative if space is tight:

```text
上海电子音乐日历｜完整活动：raveindexsh.top
```

### Pinned Note

```text
我会在这里发上海电子音乐精选路线：
techno / rave / warehouse / bass / house / experimental

小红书放精选，完整活动 calendar 看平台：
raveindexsh.top
```

### Regular Notes

Use softer, native CTAs:

```text
完整日历看主页。
```

```text
小红书这组是精选路线，完整活动 calendar 看平台。
```

```text
想看更多场次，搜：上海Rave日历 / raveindexsh.top
```

Avoid hard-diversion CTAs:

```text
点击外链买票
扫码进群
私信发链接
评论区放链接
加微信拿完整名单
```

## Operating Rules

- Put the domain in the profile and pinned entry note.
- Do not paste the domain in every note.
- If a carousel includes the domain, keep it on the final utility card as a brand marker, not a scan/click instruction.
- No QR codes in Xiaohongshu images.
- No "DM for link" automation.
- Do not ask users to leave Xiaohongshu for ticket transactions unless using an official/approved Xiaohongshu surface.
- Keep each note useful even if the reader never visits the website.

## Content Pattern For Rave Calendar

Best-fit Xiaohongshu format:

```text
Post title: 这周末上海电子音乐去哪里？按 vibe 分好
Body:
- 3-6 selected events only
- date / venue / vibe / who it fits
- source-aware wording if ticket/time is uncertain
- soft CTA: 完整日历看主页
```

The website then carries the heavier workflow:

- complete calendar
- filters
- DJ/venue pages
- ticket/source links
- ICS export
- poster archive
- trust/source notes

## Measurement Notes

Because normal users may type the URL manually, referral analytics may undercount Xiaohongshu. Consider adding a simple short landing route later, such as:

```text
raveindexsh.top/xhs
```

Only use it if it stays easy to type and does not look like a tracking link.

## Sources

- Xiaohongshu transaction diversion rule reporting: https://www.jfdaily.com/wx/detail.do?id=874347
- Xiaohongshu comment-area product-link rollout reporting: https://www.100ec.cn/detail--6648099.html
- Xiaohongshu enterprise account guide PDF: https://dc.xhscdn.com/62f0c1cfe638eb13c67415419cd6d5c75985fa2b.pdf
- Xiaohongshu lead/commercial tooling context: https://finance.sina.com.cn/tech/roll/2025-03-03/doc-inenkmnh6610314.shtml
- Xiaohongshu keyword planning tool overview: https://www.xiao-ad.com/jd/2148.html
