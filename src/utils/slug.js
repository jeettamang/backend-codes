import slugify from "slugify";
import { v4 as uuidv4 } from "uuid";
const generateSlug = (text) => {
  const data = String(text).trim();
  const result = slugify(data, { strict: true });
  const finalResult = result.concat("-", uuidv4());
  console.log({ finalResult });
  return finalResult;
};
export { generateSlug };
