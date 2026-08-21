-- 1. Permitir que usuários com a função 'DONA' atualizem qualquer perfil
create policy "DONA can update any profile"
  on public.profiles for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'DONA'
    )
  );

-- 2. Permitir que usuários com a função 'DONA' excluam qualquer perfil (opcional, mas recomendado para a funcionalidade de exclusão)
create policy "DONA can delete any profile"
  on public.profiles for delete
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'DONA'
    )
  );
