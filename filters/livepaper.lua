--[[ livepaper.lua — one Pandoc filter for both outputs (html5 and latex).
Run it BEFORE --citeproc so that @eq:x style cross-references never reach citeproc.

What it does
  * numbers sections (1, 1.2, A, A.1), equations, figures, tables, algorithms and
    theorem-like environments, and resolves @sec:x @eq:x @fig:x @tbl:x @alg:x @thm:x ...
  * ::: {.theorem #thm:x title="..."}  (lemma, proposition, corollary, definition,
    conjecture, example, claim, fact, remark, proof, takeaway, box)
  * ::: {.figure #fig:x live="figures/x.js" .wide snap=3}   caption paragraphs inside
  * ::: {.table #tbl:x .wide}     a pipe table with a `Table:` caption inside
  * ::: {.algorithm #alg:x title="..."}   an ordered list, one item per line
  * ::: {.scene #sc:x steps="a|b|c" dur=2.2}  wraps text + figures; [phrase]{.s2} and
    \htmlClass{s2}{...} inside math light up at step 2 (ranges: .s2-4)
  * $$ ... $$ {#eq:x}   numbered display equations
]]

local stringify = pandoc.utils.stringify
local IS_LATEX = FORMAT:match('latex') ~= nil
local SNAPDIR = 'build/snap'

-- ---------------------------------------------------------------- helpers
local function esc(s)
  return (tostring(s):gsub('&', '&amp;'):gsub('<', '&lt;'):gsub('>', '&gt;'):gsub('"', '&quot;'))
end
local function hid(label) return (label:gsub('[^%w%-_]', '-')) end
local function rawb(s) return pandoc.RawBlock(IS_LATEX and 'latex' or 'html', s) end
local function rawi(s) return pandoc.RawInline(IS_LATEX and 'latex' or 'html', s) end
local function has_class(el, c)
  for _, k in ipairs(el.classes or {}) do if k == c then return true end end
  return false
end
local function texesc(s)
  return (s:gsub('\\', '\\textbackslash{}'):gsub('([#$%%&_{}])', '\\%1'):gsub('~', '\\textasciitilde{}'))
end
local function warn(msg) io.stderr:write('[livepaper] ' .. msg .. '\n') end

local function md_inlines(s)
  if not s or s == '' then return pandoc.Inlines{} end
  local d = pandoc.read(s, 'markdown')
  if #d.blocks == 0 then return pandoc.Inlines{} end
  return d.blocks[1].content or pandoc.Inlines{}
end

-- blocks -> one inline list (for captions and table cells)
local function flatten(blocks)
  local out = pandoc.Inlines{}
  for i, b in ipairs(blocks) do
    if b.t == 'Para' or b.t == 'Plain' then
      if #out > 0 then out:insert(IS_LATEX and pandoc.RawInline('latex', '\\newline ') or pandoc.LineBreak()) end
      out:extend(b.content)
    elseif b.t == 'LineBlock' then
      for _, line in ipairs(b.content) do out:extend(line); out:insert(pandoc.LineBreak()) end
    else
      out:insert(pandoc.Str(stringify(b)))
    end
  end
  return out
end

-- ---------------------------------------------------------------- kinds
local ENV_NAMES = {
  theorem = 'Theorem', lemma = 'Lemma', proposition = 'Proposition', corollary = 'Corollary',
  definition = 'Definition', conjecture = 'Conjecture', example = 'Example', claim = 'Claim',
  fact = 'Fact', remark = 'Remark', proof = 'Proof',
}
local NUMBERED = { theorem = 1, lemma = 1, proposition = 1, corollary = 1, definition = 1,
  conjecture = 1, example = 1, claim = 1, fact = 1 }
local XREF_PREFIX = { sec = 1, app = 1, eq = 1, fig = 1, tbl = 1, alg = 1, thm = 1, lem = 1,
  prop = 1, cor = 1, def = 1, conj = 1, ex = 1, rem = 1, claim = 1, fact = 1 }

local function env_kind(el)
  for _, c in ipairs(el.classes) do if ENV_NAMES[c] then return c end end
  return nil
end

-- ---------------------------------------------------------------- state
local L = {}             -- label -> {kind=, prefix=, num=}
local scenes = {}        -- list of scene definitions (html only)
local cnt = { eq = 0, fig = 0, tbl = 0, alg = 0, env = 0 }
local sec = { 0, 0, 0, 0, 0, 0 }
local appendix = false

local function register(label, entry)
  if not label or label == '' then return end
  if L[label] then warn('duplicate label ' .. label) end
  L[label] = entry
end

local function sec_number(level)
  sec[level] = sec[level] + 1
  for k = level + 1, 6 do sec[k] = 0 end
  local parts = {}
  for k = 1, level do
    if k == 1 and appendix then parts[#parts + 1] = string.char(64 + sec[1])
    else parts[#parts + 1] = tostring(sec[k]) end
  end
  return table.concat(parts, '.')
end

local function display_label(inls, i)
  -- returns label, rest, index of the label Str (or nil)
  local j = i + 1
  while j <= #inls and (inls[j].t == 'Space' or inls[j].t == 'SoftBreak') do j = j + 1 end
  if j <= #inls and inls[j].t == 'Str' then
    local label, rest = inls[j].text:match('^{#([^}]+)}(.*)$')
    if label then return label, rest, j end
  end
  return nil
end

-- ---------------------------------------------------------------- pass 1: numbering
function number_display(p)
  for i, el in ipairs(p.content) do
    if el.t == 'Math' and el.mathtype == 'DisplayMath' then
      local label = display_label(p.content, i)
      if label then
        cnt.eq = cnt.eq + 1
        register(label, { kind = 'eq', prefix = 'Eq.', num = tostring(cnt.eq) })
      end
    end
  end
  return nil
end

local function number_pass(doc)
  return doc:walk {
    traverse = 'topdown',
    Header = function(h)
      if has_class(h, 'appendix') and not appendix then
        appendix = true; for k = 1, 6 do sec[k] = 0 end
      end
      if has_class(h, 'unnumbered') or h.level > 3 then return nil end
      local num = sec_number(h.level)
      h.attributes['lp-num'] = num
      local kind = appendix and 'app' or 'sec'
      register(h.identifier, { kind = kind, prefix = appendix and 'App.' or 'Sec.', num = num })
      return h
    end,
    Div = function(d)
      if has_class(d, 'figure') then
        cnt.fig = cnt.fig + 1; d.attributes['lp-num'] = tostring(cnt.fig)
        register(d.identifier, { kind = 'fig', prefix = 'Fig.', num = tostring(cnt.fig) })
        return d
      elseif has_class(d, 'table') then
        cnt.tbl = cnt.tbl + 1; d.attributes['lp-num'] = tostring(cnt.tbl)
        register(d.identifier, { kind = 'tbl', prefix = 'Table', num = tostring(cnt.tbl) })
        return d
      elseif has_class(d, 'algorithm') then
        cnt.alg = cnt.alg + 1; d.attributes['lp-num'] = tostring(cnt.alg)
        register(d.identifier, { kind = 'alg', prefix = 'Algorithm', num = tostring(cnt.alg) })
        return d
      else
        local k = env_kind(d)
        if k and NUMBERED[k] then
          cnt.env = cnt.env + 1; d.attributes['lp-num'] = tostring(cnt.env)
          register(d.identifier, { kind = 'env', prefix = ENV_NAMES[k], num = tostring(cnt.env) })
          return d
        elseif k and d.identifier ~= '' then
          register(d.identifier, { kind = 'env', prefix = ENV_NAMES[k], num = '' })
        end
      end
      return nil
    end,
    Figure = function(f)
      cnt.fig = cnt.fig + 1; f.attributes['lp-num'] = tostring(cnt.fig)
      register(f.identifier, { kind = 'fig', prefix = 'Fig.', num = tostring(cnt.fig) })
      return f
    end,
    Para = function(p) return number_display(p) end,
    Plain = function(p) return number_display(p) end,
  }
end

-- ---------------------------------------------------------------- inline transforms
local function step_class(c) return c:match('^s%d+$') or c:match('^s%d+%-%d+$') end

local function xref(cite)
  for _, c in ipairs(cite.citations) do
    local pre = c.id:match('^(%a+):')
    if not (pre and XREF_PREFIX[pre]) then return nil end
  end
  local out = pandoc.Inlines{}
  for i, c in ipairs(cite.citations) do
    if i > 1 then out:insert(pandoc.Str(',')); out:insert(pandoc.Space()) end
    if c.prefix and #c.prefix > 0 then out:extend(c.prefix); out:insert(pandoc.Space()) end
    local e = L[c.id]
    local bare = (c.mode == 'SuppressAuthor')
    if not e then
      warn('unresolved reference @' .. c.id)
      out:insert(IS_LATEX and pandoc.RawInline('latex', '\\textbf{??' .. texesc(c.id) .. '}')
        or pandoc.RawInline('html', '<span class="xref-missing" data-ref="' .. esc(c.id) .. '">??' .. esc(c.id) .. '</span>'))
    elseif IS_LATEX then
      local s
      if e.kind == 'eq' then s = bare and ('\\ref{' .. c.id .. '}') or ('\\eqref{' .. c.id .. '}')
      elseif bare then s = '\\ref{' .. c.id .. '}'
      else s = e.prefix .. '~\\ref{' .. c.id .. '}' end
      out:insert(pandoc.RawInline('latex', s))
    else
      local txt
      if e.kind == 'eq' then txt = bare and e.num or ('(' .. e.num .. ')')
      elseif bare then txt = e.num
      else txt = e.prefix .. '\u{a0}' .. e.num end
      out:insert(pandoc.RawInline('html', '<a class="xref" href="#' .. hid(c.id) .. '" data-ref="' ..
        hid(c.id) .. '">' .. esc(txt) .. '</a>'))
    end
    if c.suffix and #c.suffix > 0 then out:extend(c.suffix) end
  end
  return out
end

local function xform_inlines(inls, ctx)
  return pandoc.Inlines(inls):walk {
    Cite = function(c) return xref(c) end,
    Span = function(s)
      local stepped = false
      for _, c in ipairs(s.classes) do if step_class(c) then stepped = true end end
      if stepped then
        if IS_LATEX then return s.content end
        s.classes:insert(1, 'lp-s')
        if ctx.scene then s.attributes['scene'] = ctx.scene end
        return s
      end
      if has_class(s, 'inv') and IS_LATEX then
        local out = pandoc.Inlines{ pandoc.RawInline('latex', '\\lpinv{') }
        out:extend(s.content); out:insert(pandoc.RawInline('latex', '}'))
        return out
      end
      return nil
    end,
  }
end

local function scene_attr(ctx) return ctx.scene and (' data-scene="' .. ctx.scene .. '"') or '' end

-- ---------------------------------------------------------------- block transforms
local xform_blocks -- forward

local function trim_leading(inls)
  while #inls > 0 and (inls[1].t == 'Space' or inls[1].t == 'SoftBreak') do inls:remove(1) end
  while #inls > 0 and (inls[#inls].t == 'Space' or inls[#inls].t == 'SoftBreak') do inls:remove(#inls) end
  return inls
end

-- Para with display math: html splits into p / div.eq / p.cont; latex wraps labelled ones in equation
local function xform_para(p, ctx)
  local inls = p.content
  local has_display = false
  for _, el in ipairs(inls) do if el.t == 'Math' and el.mathtype == 'DisplayMath' then has_display = true end end
  if not has_display then
    p.content = xform_inlines(inls, ctx); return { p }
  end

  if IS_LATEX then
    local out = pandoc.Inlines{}
    local i = 1
    while i <= #inls do
      local el = inls[i]
      if el.t == 'Math' and el.mathtype == 'DisplayMath' then
        local label, rest, j = display_label(inls, i)
        if label then
          out:insert(pandoc.RawInline('latex', '\\begin{equation}\\label{' .. label .. '}' .. el.text .. '\\end{equation}'))
          if rest ~= '' then out:insert(pandoc.Str(rest)) end
          i = j
        else out:insert(el) end
      else out:insert(el) end
      i = i + 1
    end
    p.content = xform_inlines(out, ctx)
    return { p }
  end

  local blocks, cur, first = {}, pandoc.Inlines{}, true
  local function flush()
    cur = trim_leading(cur)
    if #cur > 0 then
      local content = xform_inlines(cur, ctx)
      if first then blocks[#blocks + 1] = pandoc.Para(content)
      else
        blocks[#blocks + 1] = pandoc.RawBlock('html', '<p class="cont">')
        blocks[#blocks + 1] = pandoc.Plain(content)
        blocks[#blocks + 1] = pandoc.RawBlock('html', '</p>')
      end
    end
    cur = pandoc.Inlines{}
  end
  local i = 1
  while i <= #inls do
    local el = inls[i]
    if el.t == 'Math' and el.mathtype == 'DisplayMath' then
      local label, rest, j = display_label(inls, i)
      if #trim_leading(pandoc.Inlines(cur)) > 0 then flush(); first = false else cur = pandoc.Inlines{} end
      local open = '<div class="eq"' .. scene_attr(ctx)
      local close = '</div>'
      if label then
        local e = L[label]
        open = open .. ' id="' .. hid(label) .. '" data-n="' .. e.num .. '">'
        close = '<span class="eqno">(' .. e.num .. ')</span></div>'
        i = j
        if rest ~= '' then cur:insert(pandoc.Str(rest)) end
      else open = open .. '>' end
      blocks[#blocks + 1] = pandoc.RawBlock('html', open)
      blocks[#blocks + 1] = pandoc.Plain(xform_inlines({ el }, ctx))
      blocks[#blocks + 1] = pandoc.RawBlock('html', close)
      first = false
    else
      cur:insert(el)
    end
    i = i + 1
  end
  flush()
  return blocks
end

local function caption_inlines(blocks, ctx)
  local out = pandoc.Inlines{}
  for _, b in ipairs(blocks) do
    if b.t == 'Para' or b.t == 'Plain' then
      if #out > 0 then out:insert(pandoc.Space()) end
      out:extend(b.content)
    end
  end
  return xform_inlines(out, ctx)
end

local function is_wide(el) return has_class(el, 'wide') or el.attributes['wide'] == 'true' end
local function is_full(el) return has_class(el, 'full') or el.attributes['full'] == 'true' end

-- live or static figure
local function emit_figure(id, attrs, classes_el, caption_blocks, image, ctx, capctx)
  local num = attrs['lp-num']
  local cap = caption_inlines(caption_blocks, capctx or ctx)
  local live = attrs['live']
  local name = live and live:match('([^/\\]+)%.%w+$') or nil
  local wide, full = is_wide(classes_el), is_full(classes_el)
  if IS_LATEX then
    local env = (wide or full) and 'figure*' or 'figure'
    local place = full and '[p]' or ((wide) and '[tp]' or '[htbp]')
    local snapdir = SNAPDIR
    local src
    if name then src = snapdir .. '/' .. name .. '.pdf'
    elseif image then src = image.src end
    local width = attrs['latex-width'] or (full and '\\textwidth' or '\\linewidth')
    local out = pandoc.Inlines{ pandoc.RawInline('latex',
      '\\begin{' .. env .. '}' .. place .. '\n\\centering\n' ..
      (src and ('\\includegraphics[width=' .. width .. ',height=0.82\\textheight,keepaspectratio]{' .. src .. '}\n') or '') ..
      '\\caption{') }
    out:extend(cap)
    out:insert(pandoc.RawInline('latex', '}' .. ((id ~= '') and ('\\label{' .. id .. '}') or '') .. '\n\\end{' .. env .. '}'))
    return { pandoc.Plain(out) }
  end
  local cls = 'lp-fig' .. (wide and ' wide' or '') .. (full and ' full' or '')
  local open = '<figure class="' .. cls .. '"' .. ((id ~= '') and (' id="' .. hid(id) .. '"') or '') .. scene_attr(ctx)
  if name then
    open = open .. ' data-live="' .. esc(name) .. '" data-src="' .. esc(live) .. '"'
    if attrs['snap'] then open = open .. ' data-snap="' .. esc(attrs['snap']) .. '"' end
    if attrs['height'] then open = open .. ' data-height="' .. esc(attrs['height']) .. '"' end
  end
  open = open .. '><div class="lp-art">'
  if image and not name then
    open = open .. '<img src="' .. esc(image.src) .. '" alt="' .. esc(stringify(image.caption or {})) .. '">'
  end
  open = open .. '</div><figcaption><b>Fig. ' .. (num or '') .. '.</b> '
  local blocks = { pandoc.RawBlock('html', open) }
  blocks[#blocks + 1] = pandoc.Plain(cap)
  blocks[#blocks + 1] = pandoc.RawBlock('html', '</figcaption></figure>')
  return blocks
end

local function find_image(blocks)
  local img
  pandoc.Blocks(blocks):walk { Image = function(i) img = img or i end }
  return img
end

local function strip_images(blocks)
  return pandoc.Blocks(blocks):walk { Image = function() return {} end }
end

-- tables ----------------------------------------------------------------
local ALIGN = { AlignLeft = 'l', AlignRight = 'r', AlignCenter = 'c', AlignDefault = 'l' }

local function latex_table(tbl, id, num, wide, ctx)
  local ncol = #tbl.colspecs
  local spec = {}
  for _, cs in ipairs(tbl.colspecs) do
    local a = ALIGN[cs[1]] or 'l'
    local w = cs[2]
    local col
    if type(w) == 'number' and w > 0 then
      col = '>{' .. (a == 'c' and '\\centering' or (a == 'r' and '\\raggedleft' or '\\raggedright')) ..
        '\\arraybackslash}p{' .. string.format('%.3f', w) .. '\\dimexpr\\linewidth-' .. (2 * ncol) .. '\\tabcolsep\\relax}'
    else
      col = '>{' .. (a == 'c' and '\\centering' or (a == 'r' and '\\raggedleft' or '\\raggedright')) .. '\\arraybackslash}X'
    end
    spec[#spec + 1] = col
  end
  local env = wide and 'table*' or 'table'
  local out = pandoc.Inlines{ pandoc.RawInline('latex', '\\begin{' .. env .. '}' .. (wide and '[tp]' or '[htbp]') .. '\n\\centering\\small\n') }
  local capblocks = tbl.caption and tbl.caption.long or {}
  if #capblocks > 0 or id ~= '' then
    out:insert(pandoc.RawInline('latex', '\\caption{'))
    out:extend(caption_inlines(capblocks, ctx))
    out:insert(pandoc.RawInline('latex', '}' .. ((id ~= '') and ('\\label{' .. id .. '}') or '') .. '\n'))
  end
  out:insert(pandoc.RawInline('latex', '\\begin{tabularx}{\\linewidth}{' .. table.concat(spec) .. '}\n\\toprule\n'))
  local function row(r, bold)
    for ci, cell in ipairs(r.cells) do
      if ci > 1 then out:insert(pandoc.RawInline('latex', ' & ')) end
      local inl = xform_inlines(flatten(cell.contents), ctx)
      if bold then out:insert(pandoc.RawInline('latex', '\\textit{')) end
      out:extend(inl)
      if bold then out:insert(pandoc.RawInline('latex', '}')) end
    end
    out:insert(pandoc.RawInline('latex', ' \\\\\n'))
  end
  if tbl.head and tbl.head.rows and #tbl.head.rows > 0 then
    for _, r in ipairs(tbl.head.rows) do row(r, true) end
    out:insert(pandoc.RawInline('latex', '\\midrule\n'))
  end
  for _, body in ipairs(tbl.bodies) do
    for _, r in ipairs(body.body) do row(r, false) end
  end
  out:insert(pandoc.RawInline('latex', '\\bottomrule\n\\end{tabularx}\n\\end{' .. env .. '}'))
  return { pandoc.Plain(out) }
end

local function html_table(tbl, id, num, wide, extra_blocks, ctx)
  local capblocks = tbl.caption and tbl.caption.long or {}
  local cap = caption_inlines(capblocks, ctx)
  tbl.caption = pandoc.Caption()
  -- transform cell inlines
  local function fixrows(rows)
    for _, r in ipairs(rows) do
      for _, cell in ipairs(r.cells) do cell.contents = xform_blocks(cell.contents, ctx) end
    end
  end
  if tbl.head then fixrows(tbl.head.rows) end
  for _, b in ipairs(tbl.bodies) do fixrows(b.body) end
  local open = '<div class="lp-tbl' .. (wide and ' wide' or '') .. '"' ..
    ((id ~= '') and (' id="' .. hid(id) .. '"') or '') .. scene_attr(ctx) .. '>'
  local blocks = { pandoc.RawBlock('html', open) }
  if num then
    blocks[#blocks + 1] = pandoc.RawBlock('html', '<div class="tcap">Table ' .. num .. '<span>')
    blocks[#blocks + 1] = pandoc.Plain(cap)
    blocks[#blocks + 1] = pandoc.RawBlock('html', '</span></div>')
  end
  blocks[#blocks + 1] = tbl
  for _, b in ipairs(extra_blocks or {}) do blocks[#blocks + 1] = b end
  blocks[#blocks + 1] = pandoc.RawBlock('html', '</div>')
  return blocks
end

-- algorithms --------------------------------------------------------------
local UNNUMBERED_LINE = { ['Input:'] = 1, ['Output:'] = 1, ['Require:'] = 1, ['Ensure:'] = 1,
  ['Parameters:'] = 1, ['Given:'] = 1 }

local function algo_lines(list, depth, lines)
  for _, item in ipairs(list.content) do
    local inl = pandoc.Inlines{}
    local sub = {}
    for _, b in ipairs(item) do
      if b.t == 'Plain' or b.t == 'Para' then
        if #inl > 0 then inl:insert(pandoc.Space()) end
        inl:extend(b.content)
      elseif b.t == 'OrderedList' or b.t == 'BulletList' then sub[#sub + 1] = b end
    end
    local first = stringify(inl):match('^(%S+)')
    lines[#lines + 1] = { inl = inl, depth = depth, numbered = not (first and UNNUMBERED_LINE[first]) }
    for _, s in ipairs(sub) do algo_lines(s, depth + 1, lines) end
  end
end

local function emit_algorithm(d, ctx)
  local id, num = d.identifier, d.attributes['lp-num']
  local title = md_inlines(d.attributes['title'] or '')
  local lines = {}
  for _, b in ipairs(d.content) do
    if b.t == 'OrderedList' or b.t == 'BulletList' then algo_lines(b, 0, lines) end
  end
  local n = 0
  if IS_LATEX then
    local out = pandoc.Inlines{ pandoc.RawInline('latex', '\\begin{algorithm}[htbp]\n\\caption{') }
    out:extend(xform_inlines(title, ctx))
    out:insert(pandoc.RawInline('latex', '}' .. ((id ~= '') and ('\\label{' .. id .. '}') or '') .. '\n\\begin{lpalgo}\n'))
    for _, ln in ipairs(lines) do
      if ln.numbered then n = n + 1; out:insert(pandoc.RawInline('latex', '\\item[\\lpln{' .. n .. '}]'))
      else out:insert(pandoc.RawInline('latex', '\\item[]')) end
      if ln.depth > 0 then out:insert(pandoc.RawInline('latex', '\\hspace*{' .. (1.2 * ln.depth) .. 'em}')) end
      out:extend(xform_inlines(ln.inl, ctx))
      out:insert(pandoc.RawInline('latex', '\n'))
    end
    out:insert(pandoc.RawInline('latex', '\\end{lpalgo}\n\\end{algorithm}'))
    return { pandoc.Plain(out) }
  end
  local blocks = { pandoc.RawBlock('html', '<div class="algo"' .. ((id ~= '') and (' id="' .. hid(id) .. '"') or '') ..
    scene_attr(ctx) .. '><div class="hd"><b>Algorithm ' .. (num or '') .. '</b>&nbsp; ') }
  blocks[#blocks + 1] = pandoc.Plain(xform_inlines(title, ctx))
  blocks[#blocks + 1] = pandoc.RawBlock('html', '</div><ol>')
  for _, ln in ipairs(lines) do
    local lab = ''
    if ln.numbered then n = n + 1; lab = tostring(n) end
    blocks[#blocks + 1] = pandoc.RawBlock('html', '<li class="lv' .. ln.depth .. '"' ..
      (ln.numbered and (' data-l="' .. n .. '"') or '') .. '><span class="n">' .. lab .. '</span>')
    blocks[#blocks + 1] = pandoc.Plain(xform_inlines(ln.inl, ctx))
    blocks[#blocks + 1] = pandoc.RawBlock('html', '</li>')
  end
  blocks[#blocks + 1] = pandoc.RawBlock('html', '</ol></div>')
  return blocks
end

-- environments ------------------------------------------------------------
local function emit_env(d, kind, ctx)
  local id, num = d.identifier, d.attributes['lp-num']
  local title = md_inlines(d.attributes['title'] or '')
  local body = xform_blocks(d.content, ctx)
  if IS_LATEX then
    local head = pandoc.Inlines{ pandoc.RawInline('latex', '\\begin{' .. kind .. '}') }
    if #title > 0 then
      head:insert(pandoc.RawInline('latex', '['))
      head:extend(xform_inlines(title, ctx))
      head:insert(pandoc.RawInline('latex', ']'))
    end
    if id ~= '' then head:insert(pandoc.RawInline('latex', '\\label{' .. id .. '}')) end
    local out = { pandoc.Plain(head) }
    for _, b in ipairs(body) do out[#out + 1] = b end
    out[#out + 1] = pandoc.RawBlock('latex', '\\end{' .. kind .. '}')
    return out
  end
  local headtxt = ENV_NAMES[kind] .. ((num and num ~= '') and (' ' .. num) or '')
  local head = pandoc.Inlines{ pandoc.RawInline('html', '<span class="lp-hd">' .. esc(headtxt) .. '</span>') }
  if #title > 0 then
    head:insert(pandoc.RawInline('html', ' <span class="lp-tt">('))
    head:extend(xform_inlines(title, ctx))
    head:insert(pandoc.RawInline('html', ').</span> '))
  else
    head:insert(pandoc.RawInline('html', (kind == 'proof') and ' ' or '. '))
  end
  if kind == 'proof' then head = pandoc.Inlines{ pandoc.RawInline('html', '<span class="lp-hd pf">Proof.</span> ') } end
  if body[1] and body[1].t == 'Para' then
    local c = pandoc.Inlines(head); c:extend(body[1].content); body[1].content = c
  else
    table.insert(body, 1, pandoc.Para(head))
  end
  if kind == 'proof' then
    local last = body[#body]
    if last and (last.t == 'Para' or last.t == 'Plain') then
      last.content:insert(pandoc.RawInline('html', '<span class="qed">&#8718;</span>'))
    else
      body[#body + 1] = pandoc.Para({ pandoc.RawInline('html', '<span class="qed">&#8718;</span>') })
    end
  end
  local out = { pandoc.RawBlock('html', '<div class="lp-env lp-' .. kind .. '"' ..
    ((id ~= '') and (' id="' .. hid(id) .. '"') or '') .. scene_attr(ctx) .. '>') }
  for _, b in ipairs(body) do out[#out + 1] = b end
  out[#out + 1] = pandoc.RawBlock('html', '</div>')
  return out
end

local function emit_box(d, kind, ctx)
  local label = d.attributes['title'] or (kind == 'takeaway' and 'Takeaway' or '')
  local body = xform_blocks(d.content, ctx)
  local id = d.identifier
  if IS_LATEX then
    local env = (kind == 'takeaway') and 'lptake' or 'lpbox'
    local out = { pandoc.RawBlock('latex', '\\begin{' .. env .. '}{' .. texesc(label) .. '}' ..
      ((id ~= '') and ('\\label{' .. id .. '}') or '')) }
    for _, b in ipairs(body) do out[#out + 1] = b end
    out[#out + 1] = pandoc.RawBlock('latex', '\\end{' .. env .. '}')
    return out
  end
  local cls = (kind == 'takeaway') and 'take' or 'lp-box'
  local out = { pandoc.RawBlock('html', '<div class="' .. cls .. '"' .. ((id ~= '') and (' id="' .. hid(id) .. '"') or '') ..
    scene_attr(ctx) .. '>' .. (label ~= '' and ('<div class="k">' .. esc(label) .. '</div>') or '') .. '<div class="v">') }
  for _, b in ipairs(body) do out[#out + 1] = b end
  out[#out + 1] = pandoc.RawBlock('html', '</div></div>')
  return out
end

-- main block walker ---------------------------------------------------------
xform_blocks = function(blocks, ctx)
  local out = {}
  local function add(list) for _, b in ipairs(list) do out[#out + 1] = b end end
  for _, b in ipairs(blocks) do
    local t = b.t
    if t == 'Div' then
      local kind = env_kind(b)
      if has_class(b, 'scene') then
        local sid = hid(b.identifier ~= '' and b.identifier or ('scene-' .. (#scenes + 1)))
        local steps = {}
        for s in (b.attributes['steps'] or ''):gmatch('[^|]+') do steps[#steps + 1] = s end
        scenes[#scenes + 1] = { id = sid, steps = steps, dur = tonumber(b.attributes['dur'] or '2.2'),
          title = b.attributes['title'] or '', rest = tonumber(b.attributes['rest'] or tostring(#steps)) }
        add(xform_blocks(b.content, { scene = sid }))
      elseif has_class(b, 'figure') then
        local img = find_image(b.content)
        local fctx = b.attributes['scene'] and { scene = hid(b.attributes['scene']) } or ctx
        -- a live figure outside any scene gets an implicit scene from its module's steps;
        -- step spans in its caption are tagged with that scene's id ('fig-' .. html id)
        local capctx = fctx.scene and fctx or { scene = 'fig-' .. hid(b.identifier ~= '' and b.identifier or 'anon') }
        add(emit_figure(b.identifier, b.attributes, b, strip_images(b.content), img, fctx, capctx))
      elseif has_class(b, 'table') then
        local tbl, extra = nil, {}
        for _, c in ipairs(b.content) do
          if c.t == 'Table' and not tbl then tbl = c else extra[#extra + 1] = c end
        end
        if tbl then
          if IS_LATEX then add(latex_table(tbl, b.identifier, b.attributes['lp-num'], is_wide(b), ctx))
          else add(html_table(tbl, b.identifier, b.attributes['lp-num'], is_wide(b), xform_blocks(extra, ctx), ctx)) end
        else
          warn('table div ' .. b.identifier .. ' has no table')
        end
      elseif has_class(b, 'algorithm') then
        add(emit_algorithm(b, ctx))
      elseif kind then
        add(emit_env(b, kind, ctx))
      elseif has_class(b, 'takeaway') or has_class(b, 'box') then
        add(emit_box(b, has_class(b, 'takeaway') and 'takeaway' or 'box', ctx))
      elseif b.identifier == 'refs' then
        out[#out + 1] = b
      else
        b.content = xform_blocks(b.content, ctx)
        out[#out + 1] = b
      end
    elseif t == 'Para' then
      add(xform_para(b, ctx))
    elseif t == 'Plain' then
      local disp = false
      for _, el in ipairs(b.content) do if el.t == 'Math' and el.mathtype == 'DisplayMath' then disp = true end end
      if disp then add(xform_para(pandoc.Para(b.content), ctx))
      else b.content = xform_inlines(b.content, ctx); out[#out + 1] = b end
    elseif t == 'Header' then
      local num = b.attributes['lp-num']
      b.attributes['lp-num'] = nil
      b.content = xform_inlines(b.content, ctx)
      if IS_LATEX then
        if has_class(b, 'appendix') and not LATEX_APPENDIX_DONE then
          out[#out + 1] = pandoc.RawBlock('latex', '\\appendix'); LATEX_APPENDIX_DONE = true
        end
        out[#out + 1] = b
      else
        b.attributes['rh'] = stringify(b.content)
        if num then
          local tag = (b.level == 1) and ('<span class="num">' .. num .. '</span>')
            or ('<span class="num' .. b.level .. '">' .. num .. '</span>')
          b.content:insert(1, pandoc.RawInline('html', tag))
        end
        b.identifier = hid(b.identifier)
        out[#out + 1] = b
      end
    elseif t == 'BulletList' or t == 'OrderedList' then
      for i, item in ipairs(b.content) do b.content[i] = xform_blocks(item, ctx) end
      out[#out + 1] = b
    elseif t == 'BlockQuote' then
      b.content = xform_blocks(b.content, ctx); out[#out + 1] = b
    elseif t == 'Table' then
      local hascap = b.caption and b.caption.long and #b.caption.long > 0
      if IS_LATEX then add(latex_table(b, '', nil, false, ctx))
      else add(html_table(b, '', nil, false, {}, ctx)) end
    elseif t == 'Figure' then
      local img = find_image(b.content)
      add(emit_figure(b.identifier, b.attributes, b, b.caption.long, img, ctx))
    else
      out[#out + 1] = b
    end
  end
  return out
end

-- ---------------------------------------------------------------- macros
-- Macro definitions are read straight from the YAML front matter of the input file,
-- because pandoc parses metadata strings as Markdown and would mangle TeX.
-- Supported shape:
--   macros:
--     ket: '\left|#1\right\rangle'      (single quotes: TeX verbatim, '' for a quote)
--     tr: "\\operatorname{tr}"          (double quotes: YAML escapes, \\ for a backslash)
local function macro_table(meta)
  local m = {}
  local files = PANDOC_STATE and PANDOC_STATE.input_files or {}
  for _, fname in ipairs(files) do
    local f = io.open(fname, 'r')
    if f then
      local text = f:read('a'); f:close()
      text = text:gsub('\r\n', '\n')
      local fm = text:match('^%-%-%-\n(.-)\n%-%-%-') or text:match('^%-%-%-\n(.-)\n%.%.%.')
      if fm then
        local inblock = false
        for line in (fm .. '\n'):gmatch('([^\n]*)\n') do
          if line:match('^macros:%s*$') then inblock = true
          elseif inblock then
            if line:match('^%S') then inblock = false
            else
              local k, v = line:match("^%s+\\?([%a@]+):%s*'(.*)'%s*$")
              if k then v = v:gsub("''", "'")
              else
                k, v = line:match('^%s+\\?([%a@]+):%s*"(.*)"%s*$')
                if k then v = v:gsub('\\(.)', '%1') -- YAML double-quote escapes: \\ -> \
                else k, v = line:match('^%s+\\?([%a@]+):%s*(.-)%s*$') end
              end
              if k and v and v ~= '' then m['\\' .. k] = v end
            end
          end
        end
      end
    end
  end
  return m
end

local function latex_macros(m)
  local lines = {}
  local names = {}
  for k in pairs(m) do names[#names + 1] = k end
  table.sort(names)
  for _, k in ipairs(names) do
    local def = m[k]
    local nargs = 0
    for d in def:gmatch('#(%d)') do nargs = math.max(nargs, tonumber(d)) end
    lines[#lines + 1] = '\\providecommand{' .. k .. '}{}\\renewcommand{' .. k .. '}' ..
      (nargs > 0 and ('[' .. nargs .. ']') or '') .. '{' .. def .. '}'
  end
  return table.concat(lines, '\n')
end

-- ---------------------------------------------------------------- entry point
function Pandoc(doc)
  doc = number_pass(doc)
  local meta = doc.meta

  -- abstract scene (phrases in the abstract that follow the first figure's steps)
  if meta['abstract-steps'] and IS_LATEX == false then
    local steps = {}
    for s in stringify(meta['abstract-steps']):gmatch('[^|]+') do steps[#steps + 1] = s end
    scenes[#scenes + 1] = { id = 'abstract', steps = steps, dur = tonumber(stringify(meta['abstract-dur'] or '2.4')),
      title = 'Abstract', rest = #steps }
  end
  if meta['lp-snapdir'] then SNAPDIR = stringify(meta['lp-snapdir']) end
  if meta.abstract then
    local actx = { scene = meta['abstract-steps'] and 'abstract' or nil }
    local ab = meta.abstract
    if pandoc.utils.type(ab) == 'Inlines' then ab = pandoc.Blocks { pandoc.Para(ab) } end
    meta.abstract = pandoc.MetaBlocks(pandoc.Blocks(ab):walk {
      Para = function(p) p.content = xform_inlines(p.content, actx); return p end,
      Plain = function(p) p.content = xform_inlines(p.content, actx); return p end,
    })
  end
  if meta.title then meta.title = pandoc.MetaInlines(xform_inlines(pandoc.Inlines(meta.title), {})) end

  local blocks = xform_blocks(doc.blocks, {})
  local macros = macro_table(meta)

  if IS_LATEX then
    meta['lp-latex-macros'] = pandoc.MetaBlocks { pandoc.RawBlock('latex', latex_macros(macros)) }
  else
    local labels = {}
    for k, v in pairs(L) do labels[hid(k)] = { kind = v.kind, num = v.num, prefix = v.prefix } end
    table.insert(blocks, 1, pandoc.RawBlock('html',
      '<script type="application/json" id="lp-data">' ..
      pandoc.json.encode({ scenes = scenes, macros = macros, labels = labels }):gsub('</', '<\\/') ..
      '</script>'))
  end
  return pandoc.Pandoc(blocks, meta)
end
