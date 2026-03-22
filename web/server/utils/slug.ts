import slugify from 'slugify'

export function makeSlug(text: string): string {
  return slugify(text, { lower: true, strict: true })
}
