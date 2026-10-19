/**
 * 心情记录 —— 数据与逻辑层
 *
 * 设计要点：
 * 1. 心情表情全部用数字 id 存储，不存字符串 —— 省空间，且便于将来换视觉方案。
 * 2. 存储按天拆分：mood_days 只存日期索引，mood_<日期> 存当天记录。
 *    打开应用只读「今天」那一条，不要把所有历史一次读出来。
 * 3. storage 只接受 String，且没有文档化的容量上限 → 每天设上限，防止单 key 无限膨胀。
 */

import storage from '@system.storage'

/* ------------------------------------------------------------------ */
/* 心情定义                                                            */
/* ------------------------------------------------------------------ */

/**
 * 7 种心情，表情用 Windows 11 Fluent Emoji 官方素材（微软，MIT 许可）。
 *
 * 为什么用图片而不是 Unicode emoji：
 *   实测发现 Vela 模拟器字库**没有 emoji 字体**，Unicode emoji 会渲染成"豆腐块"。
 * 为什么不用纯 CSS 画脸：
 *   CSS 画脸可行（且已验证），但表达能力有限 —— 像"小丑""冷汗"这种复杂表情很难画好。
 *   而 Fluent 素材又好看又免费又合法，7 张 64×64 PNG 一共只要 43 KB。
 *
 * color 字段用于历史圆点和热力图 —— 图片没法取色，所以在这里手工指定一个代表色。
 */
export const MOODS = [
  { id: 0, name: '喜笑颜开', color: '#ffca28', img: '/common/images/mood/joy.png' },
  { id: 1, name: '得意',     color: '#ffb74d', img: '/common/images/mood/smug.png' },
  { id: 2, name: '冷漠',     color: '#b0bec5', img: '/common/images/mood/cold.png' },
  { id: 3, name: '无语',     color: '#90a4ae', img: '/common/images/mood/speech.png' },
  { id: 4, name: '冷汗',     color: '#4fc3f7', img: '/common/images/mood/sweat.png' },
  { id: 5, name: '放声大哭', color: '#42a5f5', img: '/common/images/mood/cry.png' },
  { id: 6, name: '小丑',     color: '#ef5350', img: '/common/images/mood/clown.png' }
]

/** 一天最多记多少条 */
export const PER_DAY_LIMIT = 50

/* ------------------------------------------------------------------ */
/* 时间工具                                                            */
/* ------------------------------------------------------------------ */

function pad2(n) {
  return (n < 10 ? '0' : '') + n
}

/** 20261016 */
export function stamp(d) {
  const t = d || new Date()
  return '' + t.getFullYear() + pad2(t.getMonth() + 1) + pad2(t.getDate())
}

/** 10-16 这种短显示 */
export function shortDate(stampStr) {
  if (!stampStr || stampStr.length !== 8) return stampStr
  return stampStr.slice(4, 6) + '-' + stampStr.slice(6, 8)
}

/** 1032 这种时分 */
export function timeStr(ms) {
  if (!ms) return ''
  const d = new Date(ms)
  return pad2(d.getHours()) + ':' + pad2(d.getMinutes())
}

/** 把 20261016 转成 Date */
export function parseStamp(stampStr) {
  const y = Number(stampStr.slice(0, 4))
  const m = Number(stampStr.slice(4, 6)) - 1
  const day = Number(stampStr.slice(6, 8))
  return new Date(y, m, day)
}

/* ------------------------------------------------------------------ */
/* 存储封装（回调 → Promise）                                          */
/* ------------------------------------------------------------------ */

export function load(key, def) {
  return new Promise(function (resolve) {
    storage.get({
      key: key,
      default: def === undefined ? '' : def,
      success: function (data) { resolve(data) },
      fail: function () { resolve(def === undefined ? '' : def) }
    })
  })
}

export function save(key, value) {
  return new Promise(function (resolve) {
    storage.set({
      key: key,
      value: String(value),
      success: function () { resolve(true) },
      fail: function (data, code) {
        console.log('[MOOD][storage] set FAIL key=' + key + ' code=' + code)
        resolve(false)
      }
    })
  })
}

/** 读 JSON，坏了就返回兜底值，不让应用崩 */
export function loadJson(key, def) {
  return load(key, '').then(function (raw) {
    if (!raw) return def
    try {
      const v = JSON.parse(raw)
      return v === null || v === undefined ? def : v
    } catch (e) {
      console.log('[MOOD][storage] JSON 解析失败 key=' + key + ' raw=' + raw)
      return def
    }
  })
}

export function saveJson(key, obj) {
  return save(key, JSON.stringify(obj))
}

/* ------------------------------------------------------------------ */
/* 业务操作                                                            */
/* ------------------------------------------------------------------ */

export const KEY_DAYS = 'mood_days'

/** key 里存的是纯数字，避免出现奇怪字符 */
export function dayKey(stampStr) {
  return 'mood_' + stampStr
}

/**
 * 记录一次心情。
 * @returns Promise<{ ok, count, reason }>
 */
export function record(moodId) {
  const today = stamp()
  const key = dayKey(today)

  return loadJson(key, []).then(function (list) {
    const arr = Array.isArray(list) ? list : []
    if (arr.length >= PER_DAY_LIMIT) {
      console.log('[MOOD] 今天已达上限 ' + PER_DAY_LIMIT)
      return { ok: false, count: arr.length, reason: 'limit' }
    }
    arr.push({ t: Date.now(), e: moodId })
    return saveJson(key, arr).then(function (okSet) {
      if (!okSet) return { ok: false, count: arr.length, reason: 'storage' }
      // 维护日期索引
      return loadJson(KEY_DAYS, []).then(function (days) {
        const d = Array.isArray(days) ? days : []
        if (d.indexOf(today) < 0) {
          d.push(today)
          return saveJson(KEY_DAYS, d).then(function () {
            return { ok: true, count: arr.length }
          })
        }
        return { ok: true, count: arr.length }
      })
    })
  })
}

/** 读某天的记录数组 */
export function dayEntries(stampStr) {
  return loadJson(dayKey(stampStr), []).then(function (v) {
    return Array.isArray(v) ? v : []
  })
}

/** 读日期索引（降序，最近的在前） */
export function allDays() {
  return loadJson(KEY_DAYS, []).then(function (v) {
    const arr = Array.isArray(v) ? v : []
    // 倒序 + 去重
    const seen = {}
    const out = []
    for (let i = arr.length - 1; i >= 0; i--) {
      const k = String(arr[i])
      if (!seen[k]) { seen[k] = 1; out.push(k) }
    }
    out.sort()
    out.reverse()
    return out
  })
}

/** 把最近 n 天的日期串都列出来（含没记录的），降序 */
export function recentStamps(n) {
  const out = []
  const now = new Date()
  for (let i = 0; i < n; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
    out.push(stamp(d))
  }
  return out
}

/** 连续记录天数（从今天往回数） */
export function streakFrom(days) {
  const set = {}
  for (let i = 0; i < days.length; i++) set[days[i]] = 1
  let n = 0
  const now = new Date()
  for (let i = 0; i < 400; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
    if (set[stamp(d)]) n++
    else break
  }
  return n
}

/** 统计某天的各心情次数 → [{mood, count, pct}] */
export function countByMood(entries) {
  const buckets = []
  for (let i = 0; i < MOODS.length; i++) buckets.push(0)
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i]
    if (e && e.e >= 0 && e.e < MOODS.length) buckets[e.e]++
  }
  const total = entries.length || 1
  const out = []
  for (let i = 0; i < MOODS.length; i++) {
    if (buckets[i] > 0) {
      out.push({
        mood: MOODS[i],
        count: buckets[i],
        pct: Math.round(buckets[i] * 100 / total)
      })
    }
  }
  return out
}

/** 某天的主导心情 id（次数最多；并列取更靠前的） */
export function dominantMood(entries) {
  if (!entries || entries.length === 0) return -1
  const buckets = []
  for (let i = 0; i < MOODS.length; i++) buckets.push(0)
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i]
    if (e && e.e >= 0 && e.e < MOODS.length) buckets[e.e]++
  }
  let best = -1
  let bestN = 0
  for (let i = 0; i < buckets.length; i++) {
    if (buckets[i] > bestN) { bestN = buckets[i]; best = i }
  }
  return best
}

/** 生成热力图数据：最近 n 天，每格带 moodId 和次数 */
export function heatmap(n, days, entriesByStamp) {
  const stamps = recentStamps(n)
  const set = {}
  for (let i = 0; i < days.length; i++) set[days[i]] = 1
  const out = []
  for (let i = 0; i < stamps.length; i++) {
    const s = stamps[i]
    const list = entriesByStamp[s] || []
    out.push({
      stamp: s,
      day: s.slice(6, 8),
      has: !!set[s],
      mood: dominantMood(list),
      count: list.length
    })
  }
  return out
}
