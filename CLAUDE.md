# Reversa

> Framework de Engenharia Reversa instalado neste projeto.

## Como usar

Digite `/reversa` para ativar o Reversa e iniciar ou retomar a analise do projeto.

## Comportamento ao ativar

Quando o usuario digitar `/reversa` ou a palavra `reversa` sozinha em uma mensagem:

1. Ative o skill `reversa` disponivel em `.claude/skills/reversa/SKILL.md`
2. Se nao encontrar em `.claude/skills/`, tente `.agents/skills/reversa/SKILL.md`
3. Leia o SKILL.md na integra e siga exatamente as instrucoes do Reversa

## Regra nao-negociavel

Nunca apague, modifique ou sobrescreva arquivos pre-existentes do projeto legado.
O Reversa escreve **apenas** em `.reversa/` e `_reversa_sdd/`.