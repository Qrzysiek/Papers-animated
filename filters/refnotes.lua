--[[
refnotes.lua — reference notes for livepaper. Run AFTER --citeproc.

For every bibliography entry (Div #ref-KEY.csl-entry) whose CSL-JSON item has
  "x-summary": a short summary (Pandoc Markdown, $...$ math allowed), and/or
  "abstract":  the full abstract (Pandoc Markdown),
it appends the summary under the entry text (HTML: span.ref-sum; LaTeX: a small italic line inside \CSLRightInline),
and, in HTML only, the full abstract as a hidden div.ref-abs that the runtime shows as a tooltip on hover or tap.
Items without these fields are left alone, so the filter is a no-op for bibliographies without them.
The bibliography is read from the `bibliography` metadata (CSL-JSON files only), relative to the working directory.
]]

local IS_LATEX = FORMAT:match('latex') ~= nil
local items = {}

local function as_list(v)
  if not v then return {} end
  if type(v) == 'table' and v.t == nil and #v > 0 then return v end
  return { v }
end

local function load(meta)
  for _, b in ipairs(as_list(meta.bibliography)) do
    local path = pandoc.utils.stringify(b)
    if path:match('%.json$') then
      local f = io.open(path, 'r')
      if f then
        local txt = f:read('a'); f:close()
        local ok, arr = pcall(pandoc.json.decode, txt, false)
        if ok and type(arr) == 'table' then
          for _, e in ipairs(arr) do
            if type(e) == 'table' and e.id then items[e.id] = { s = e['x-summary'], a = e['abstract'] } end
          end
        end
      end
    end
  end
end

local function md_inlines(s)
  local blocks = pandoc.read(s, 'markdown-citations').blocks
  local out = pandoc.Inlines {}
  for i, b in ipairs(blocks) do
    if b.content then
      if i > 1 then out:insert(pandoc.Space()) end
      out:extend(b.content)
    end
  end
  return out
end

local function entry(d)
  if not d.classes:includes('csl-entry') then return nil end
  local key = d.identifier:gsub('^ref%-', '')
  local it = items[key]
  if not it or not (it.s or it.a) then return nil end
  if it.s and it.s ~= '' then
    local sum = md_inlines(it.s)
    d = d:walk {
      Span = function(sp)
        if not sp.classes:includes('csl-right-inline') then return nil end
        if IS_LATEX then
          sp.content:insert(pandoc.RawInline('latex', '\\newline{\\itshape '))
          sp.content:extend(sum)
          sp.content:insert(pandoc.RawInline('latex', '}'))
        else
          sp.content:insert(pandoc.Span(sum, { class = 'ref-sum' }))
        end
        return sp
      end,
    }
  end
  if not IS_LATEX then
    local body
    if it.a and it.a ~= '' then
      -- The HTML writer turns every Para inside a csl-entry into Plain, so paragraphs would run together;
      -- give each its own block.
      body = pandoc.read(it.a, 'markdown-citations').blocks:map(function(b)
        if b.t == 'Para' then return pandoc.Div({ pandoc.Plain(b.content) }, { class = 'ref-abs-p' }) end
        return b
      end)
    else
      body = { pandoc.Plain { pandoc.Str('No abstract is published for this work.') } }
    end
    d.content:insert(pandoc.Div(body, { class = 'ref-abs' }))
  end
  return d
end

return {
  { Meta = function(m) load(m) end },
  { Div = entry },
}
