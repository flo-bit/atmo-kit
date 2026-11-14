---
'@atmo-dev/kit': minor
---

`NestedComments` is now a thread view: replies hang from a line under the post they answer, a comment's line folds its replies, and branches that are deeper than `maxDepth` or were not loaded link to the rest. Apps can render their own post body and actions with the `content` and `actions` snippets and route links with `postUrl` and `profileUrl`; `comments` accepts any type extending `PostData`. A comment's name now links to the author and its timestamp to the post, shown as relative time.

`PostContent` lays images out in up to four tiles and opens them in the photo viewer instead of a new tab, keeps a video's aspect ratio, loops GIF-style clips, and shows the author's avatar on quoted posts. `PostData` video embeds take `aspectRatio` and `gif`.

`PostData.replies` left undefined now means the replies were not loaded, and a non-zero `replyCount` then shows a link to them. Set `replies: []` for comments whose replies were loaded.
