<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- Data access uses the browser client with RLS (roles in `user_roles`, checked via `has_role`/`is_staff`) — keeps logic simple without server functions.
- First signed-up user becomes admin via `handle_new_user` trigger; others default to operador — bootstraps the system without manual SQL.
- Every change to an occurrence also writes a row to `ocorrencia_historico` — audit trail.
