-- Phase S0 — Exercise Library Foundation
-- Adds media columns to public.exercises and seeds real exercises whose
-- frames live in the public Storage bucket "exercises".
-- Generated from storage.objects (paths verbatim). Additive + idempotent.

alter table public.exercises
  add column if not exists thumbnail_path   text,
  add column if not exists image_start_path text,
  add column if not exists image_end_path   text,
  add column if not exists media_type       text not null default 'none';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'exercises_media_type_check') then
    alter table public.exercises
      add constraint exercises_media_type_check
      check (media_type in ('none', 'image_pair', 'gif', 'video'));
  end if;
end $$;

insert into public.exercises
  (slug, name, description, primary_muscle, equipment, media_type, thumbnail_path, image_start_path, image_end_path)
values
  ('abducao-no-cross', 'Abdução no Cross', 'Foco em glúteos com polia.', 'gluteos', 'polia', 'image_pair', 'Abducao no Cross/Abducao no Cross1.jpg', 'Abducao no Cross/Abducao no Cross1.jpg', 'Abducao no Cross/Abducao no Cross2.jpg'),
  ('afundo-com-halteres', 'Afundo com Halteres', 'Foco em quadríceps com halteres.', 'quadriceps', 'halteres', 'image_pair', 'Afundo com Halteres/Afundo com halteres1.jpg', 'Afundo com Halteres/Afundo com halteres1.jpg', 'Afundo com Halteres/Afundo com halteres2.jpg'),
  ('afundo-no-smith', 'Afundo no Smith', 'Foco em quadríceps com Smith.', 'quadriceps', 'smith', 'image_pair', 'Afundo no Smith/Afundo no smith1.jpg', 'Afundo no Smith/Afundo no smith1.jpg', 'Afundo no Smith/Afundo no smith2.jpg'),
  ('afundo-no-step', 'Afundo no Step', 'Foco em quadríceps com peso corporal.', 'quadriceps', 'peso corporal', 'image_pair', 'Afundo no Step/Afundo no step1.jpg', 'Afundo no Step/Afundo no step1.jpg', 'Afundo no Step/Afundo no step2.jpg'),
  ('agachamento-hack', 'Agachamento Hack', 'Foco em quadríceps com máquina.', 'quadriceps', 'maquina', 'image_pair', 'Agachamento Hack/Agachamento hack1.jpg', 'Agachamento Hack/Agachamento hack1.jpg', 'Agachamento Hack/Agachamento hack2.jpg'),
  ('agachamento-no-smith', 'Agachamento no Smith', 'Foco em quadríceps com Smith.', 'quadriceps', 'smith', 'image_pair', 'Agachamento no Smith/Agachamento no smith1.jpg', 'Agachamento no Smith/Agachamento no smith1.jpg', 'Agachamento no Smith/Agachamento no smith2.jpg'),
  ('agachamento-sumo', 'Agachamento Sumo', 'Foco em glúteos com halteres.', 'gluteos', 'halteres', 'image_pair', 'Agachamento sumo/Agachamento sumo1.jpg', 'Agachamento sumo/Agachamento sumo1.jpg', 'Agachamento sumo/Agachamento sumo2.jpg'),
  ('cadeira-adutora', 'Cadeira Adutora', 'Foco em adutores com máquina.', 'adutores', 'maquina', 'image_pair', 'Cadeira adutora/Cadeira adutora1.jpg', 'Cadeira adutora/Cadeira adutora1.jpg', 'Cadeira adutora/Cadeira adutora2.jpg'),
  ('cadeira-flexora', 'Cadeira Flexora', 'Foco em posteriores de coxa com máquina.', 'posteriores', 'maquina', 'image_pair', 'Cadeira Flexora/Cadeira flexora1.jpg', 'Cadeira Flexora/Cadeira flexora1.jpg', 'Cadeira Flexora/Cadeira flexora2.jpg'),
  ('cross-over', 'Cross Over', 'Foco em peitoral com polia.', 'peitoral', 'polia', 'image_pair', 'Cross Over/CrossOver1.png', 'Cross Over/CrossOver1.png', 'Cross Over/CrossOver2.png'),
  ('cross-over-polia-baixa', 'Cross Over Polia Baixa', 'Foco em peitoral com polia.', 'peitoral', 'polia', 'image_pair', 'Cross Over Polia Baixa/Cross Over Polia Baixa.png', 'Cross Over Polia Baixa/Cross Over Polia Baixa.png', 'Cross Over Polia Baixa/Cross Over Polia Baixa2.png'),
  ('cross-over-polia-media', 'Cross Over Polia Média', 'Foco em peitoral com polia.', 'peitoral', 'polia', 'image_pair', 'Cross Over Polia Media/Cross Over Polia Media_1080x1080.jpg', 'Cross Over Polia Media/Cross Over Polia Media_1080x1080.jpg', 'Cross Over Polia Media/Cross Over Polia Media2_1080x1080.jpg'),
  ('crucifixo-declinado', 'Crucifixo Declinado', 'Foco em peitoral com halteres.', 'peitoral', 'halteres', 'image_pair', 'Crucifixo Declinado/resized_padded_portrait_Crucifixo declinado1.jpg', 'Crucifixo Declinado/resized_padded_portrait_Crucifixo declinado1.jpg', 'Crucifixo Declinado/resized_padded_portrait_Crucifixo declinado2.jpg'),
  ('crucifixo-inclinado-halteres', 'Crucifixo Inclinado com Halteres', 'Foco em peitoral com halteres.', 'peitoral', 'halteres', 'image_pair', 'Crucifixo Inclinado Halter/Crucifico Inclinado Halter.png', 'Crucifixo Inclinado Halter/Crucifico Inclinado Halter.png', 'Crucifixo Inclinado Halter/Crucifico Inclinado Halter2.png'),
  ('crucifixo-maquina', 'Crucifixo na Máquina', 'Foco em peitoral com máquina.', 'peitoral', 'maquina', 'image_pair', 'Crucifixo Maquina/Crucifixo Maquina.png', 'Crucifixo Maquina/Crucifixo Maquina.png', 'Crucifixo Maquina/Crucifixo Maquina1.png'),
  ('crucifixo-reto-halteres', 'Crucifixo Reto com Halteres', 'Foco em peitoral com halteres.', 'peitoral', 'halteres', 'image_pair', 'Crucifixo Reto Halter/Crucifixo Reto Halter1.png', 'Crucifixo Reto Halter/Crucifixo Reto Halter1.png', 'Crucifixo Reto Halter/Crucifixo Reto Halter2.png'),
  ('desenvolvimento-arnold', 'Desenvolvimento Arnold', 'Foco em ombros com halteres.', 'ombros', 'halteres', 'image_pair', 'Desenvolvimento arnold/Desenvolvimento arnold1.jpg', 'Desenvolvimento arnold/Desenvolvimento arnold1.jpg', 'Desenvolvimento arnold/Desenvolvimento arnold2.jpg'),
  ('desenvolvimento-halteres', 'Desenvolvimento com Halteres', 'Foco em ombros com halteres.', 'ombros', 'halteres', 'image_pair', 'Desenvolvimento com Halteres/desenvolvimento  com halteres1.png', 'Desenvolvimento com Halteres/desenvolvimento  com halteres1.png', 'Desenvolvimento com Halteres/desenvolvimento  com halteres2.png'),
  ('desenvolvimento-halteres-rotacao', 'Desenvolvimento com Halteres e Rotação', 'Foco em ombros com halteres.', 'ombros', 'halteres', 'image_pair', 'Desenvolvimento com halteres com rotacao/Desenvolvimento com rotacao1.png', 'Desenvolvimento com halteres com rotacao/Desenvolvimento com rotacao1.png', 'Desenvolvimento com halteres com rotacao/Desenvolvimento com rotacao2.png'),
  ('desenvolvimento-maquina', 'Desenvolvimento na Máquina', 'Foco em ombros com máquina.', 'ombros', 'maquina', 'image_pair', 'desenvolvimento maquina/desenvolmento maquina1.png', 'desenvolvimento maquina/desenvolmento maquina1.png', 'desenvolvimento maquina/desenvolmento maquina2.png'),
  ('elevacao-frontal-barra', 'Elevação Frontal com Barra', 'Foco em ombros com barra.', 'ombros', 'barra', 'image_pair', 'Elevacao frontal pronada com a barra livre/Elevacao frontal pronada com a barra livre1.png', 'Elevacao frontal pronada com a barra livre/Elevacao frontal pronada com a barra livre1.png', 'Elevacao frontal pronada com a barra livre/Elevacao frontal pronada com a barra livre2.png'),
  ('elevacao-frontal-halteres', 'Elevação Frontal com Halteres', 'Foco em ombros com halteres.', 'ombros', 'halteres', 'image_pair', 'Elevacao frontal pronada com halteres/Elevacao frontal pronada com halteres.png', 'Elevacao frontal pronada com halteres/Elevacao frontal pronada com halteres.png', 'Elevacao frontal pronada com halteres/Elevacao frontal pronada com halteres1.png'),
  ('elevacao-frontal-pronada-cross', 'Elevação Frontal Pronada no Cross', 'Foco em ombros com polia.', 'ombros', 'polia', 'image_pair', 'Elevacao frontal pegada pronada no Cross/Elevacao frontal pegada pronada no Cross1.png', 'Elevacao frontal pegada pronada no Cross/Elevacao frontal pegada pronada no Cross1.png', 'Elevacao frontal pegada pronada no Cross/Elevacao frontal pegada pronada no Cross2.png'),
  ('elevacao-lateral-halteres', 'Elevação Lateral com Halteres', 'Foco em ombros com halteres.', 'ombros', 'halteres', 'image_pair', 'Elevacao Lateral Halteres/Elevacao Lateral Halteres1.png', 'Elevacao Lateral Halteres/Elevacao Lateral Halteres1.png', 'Elevacao Lateral Halteres/Elevacao Lateral Halteres2.png'),
  ('elevacao-lateral-unilateral-cross', 'Elevação Lateral Unilateral no Cross', 'Foco em ombros com polia.', 'ombros', 'polia', 'image_pair', 'Elevacao unilateral no Cross/Elevacao unilateral no Cross1.png', 'Elevacao unilateral no Cross/Elevacao unilateral no Cross1.png', 'Elevacao unilateral no Cross/Elevacao unilateral no Cross2.png'),
  ('elevacao-lateral-unilateral-halter', 'Elevação Lateral Unilateral com Halter', 'Foco em ombros com halteres.', 'ombros', 'halteres', 'image_pair', 'Elevacao unilateral Halter/Elevacao unilateral Halter1.png', 'Elevacao unilateral Halter/Elevacao unilateral Halter1.png', 'Elevacao unilateral Halter/Elevacao unilateral Halter2.png'),
  ('elevacao-pelvica', 'Elevação Pélvica', 'Foco em glúteos com barra.', 'gluteos', 'barra', 'image_pair', 'Elevacao pelvica/Elevacao pelvica.jpg', 'Elevacao pelvica/Elevacao pelvica.jpg', 'Elevacao pelvica/Elevacao pelvica1.jpg'),
  ('gemeos-no-leg-press', 'Gêmeos no Leg Press', 'Foco em panturrilha com máquina.', 'panturrilha', 'maquina', 'image_pair', 'Gemeos no Leg Press/Gemeos no Leg Press1.jpg', 'Gemeos no Leg Press/Gemeos no Leg Press1.jpg', 'Gemeos no Leg Press/Gemeos no Leg Press2.jpg'),
  ('leg-press-45', 'Leg Press 45°', 'Foco em quadríceps com máquina.', 'quadriceps', 'maquina', 'image_pair', 'Leg Press 45/Leg press 45 - 1.jpg', 'Leg Press 45/Leg press 45 - 1.jpg', 'Leg Press 45/Leg press 45 - 2.jpg'),
  ('leg-press-horizontal', 'Leg Press Horizontal', 'Foco em quadríceps com máquina.', 'quadriceps', 'maquina', 'image_pair', 'Leg Press Horizontal/Leg press horizontal1.jpg', 'Leg Press Horizontal/Leg press horizontal1.jpg', 'Leg Press Horizontal/Leg press horizontal2.jpg'),
  ('levantamento-terra', 'Levantamento Terra', 'Foco em posteriores de coxa com barra.', 'posteriores', 'barra', 'image_pair', 'Levantamento terra/Levantamento terra1.jpg', 'Levantamento terra/Levantamento terra1.jpg', 'Levantamento terra/Levantamento terra2.jpg'),
  ('mesa-flexora', 'Mesa Flexora', 'Foco em posteriores de coxa com máquina.', 'posteriores', 'maquina', 'image_pair', 'Mesa Flexora/Mesa flexora1.jpg', 'Mesa Flexora/Mesa flexora1.jpg', 'Mesa Flexora/Mesa flexora2.jpg'),
  ('passada-com-halteres', 'Passada com Halteres', 'Foco em quadríceps com halteres.', 'quadriceps', 'halteres', 'image_pair', 'Passadas com halteres/Passadas com halteres1.jpg', 'Passadas com halteres/Passadas com halteres1.jpg', 'Passadas com halteres/Passadas com halteres2.jpg'),
  ('peck-deck', 'Peck Deck', 'Foco em peitoral com máquina.', 'peitoral', 'maquina', 'image_pair', 'Peck Deck/PeckDeck1.png', 'Peck Deck/PeckDeck1.png', 'Peck Deck/PeckDeck2.png'),
  ('pull-down', 'Pull Down', 'Foco em costas com polia.', 'costas', 'polia', 'image_pair', 'Pull Down/Pull Down1.png', 'Pull Down/Pull Down1.png', 'Pull Down/Pull Down2.png'),
  ('pull-over', 'Pull Over', 'Foco em costas com polia.', 'costas', 'polia', 'image_pair', 'Pull Over/Pull Over1.png', 'Pull Over/Pull Over1.png', 'Pull Over/Pull Over2.png'),
  ('puxada-frente', 'Puxada Frente', 'Foco em costas com polia.', 'costas', 'polia', 'image_pair', 'Pulley Frente/Pulley Frente1.png', 'Pulley Frente/Pulley Frente1.png', 'Pulley Frente/Pulley Frente2.png'),
  ('puxada-frente-triangulo', 'Puxada Frente com Triângulo', 'Foco em costas com polia.', 'costas', 'polia', 'image_pair', 'Pulley Frente Triangulo/Pulley Frente Triangulo1.png', 'Pulley Frente Triangulo/Pulley Frente Triangulo1.png', 'Pulley Frente Triangulo/Pulley Frente Triangulo2.png'),
  ('puxada-nuca', 'Puxada Nuca', 'Foco em costas com polia.', 'costas', 'polia', 'image_pair', 'Pulley Nuca/Pulley Nuca1.png', 'Pulley Nuca/Pulley Nuca1.png', 'Pulley Nuca/Pulley Nuca2.png'),
  ('remada-baixa-supinada', 'Remada Baixa Supinada', 'Foco em costas com polia.', 'costas', 'polia', 'image_pair', 'Remada baixa supinada/Remada baixa supinada1.jpg', 'Remada baixa supinada/Remada baixa supinada1.jpg', 'Remada baixa supinada/Remada baixa supinada2.jpg'),
  ('remada-baixa-triangulo', 'Remada Baixa com Triângulo', 'Foco em costas com polia.', 'costas', 'polia', 'image_pair', 'Remada baixa triangulo/Remada baixa triangulo1.jpg', 'Remada baixa triangulo/Remada baixa triangulo1.jpg', 'Remada baixa triangulo/Remada baixa triangulo2.jpg'),
  ('stiff-com-barra', 'Stiff com Barra', 'Foco em posteriores de coxa com barra.', 'posteriores', 'barra', 'image_pair', 'Stiff com a barra/Stiff com a barra1.jpg', 'Stiff com a barra/Stiff com a barra1.jpg', 'Stiff com a barra/Stiff com a barra2.jpg'),
  ('stiff-unilateral', 'Stiff Unilateral', 'Foco em posteriores de coxa com halteres.', 'posteriores', 'halteres', 'image_pair', 'Stiff unilateral/Stiff unilateral1.jpg', 'Stiff unilateral/Stiff unilateral1.jpg', 'Stiff unilateral/Stiff unilateral2.jpg'),
  ('supino-declinado-barra', 'Supino Declinado com Barra', 'Foco em peitoral com barra.', 'peitoral', 'barra', 'image_pair', 'Supino Declinado Barra/Supino Declinado Barra1.png', 'Supino Declinado Barra/Supino Declinado Barra1.png', 'Supino Declinado Barra/Supino Declinado Barra2.png'),
  ('supino-declinado-halteres', 'Supino Declinado com Halteres', 'Foco em peitoral com halteres.', 'peitoral', 'halteres', 'image_pair', 'Supino Declinado com Halter/Supino Declinado com Halter1.png', 'Supino Declinado com Halter/Supino Declinado com Halter1.png', 'Supino Declinado com Halter/Supino Declinado com Halter2.png'),
  ('supino-declinado-smith', 'Supino Declinado no Smith', 'Foco em peitoral com Smith.', 'peitoral', 'smith', 'image_pair', 'Supino Declinado Smith/Supino Declinado Smith1.png', 'Supino Declinado Smith/Supino Declinado Smith1.png', 'Supino Declinado Smith/Supino Declinado Smith2.png'),
  ('supino-inclinado-halteres', 'Supino Inclinado com Halteres', 'Foco em peitoral com halteres.', 'peitoral', 'halteres', 'image_pair', 'Supino Inclinado Halter/Supino_Inclinado_Halter.png', 'Supino Inclinado Halter/Supino_Inclinado_Halter.png', 'Supino Inclinado Halter/Supino_Inclinado_Halter1.png'),
  ('supino-inclinado-smith', 'Supino Inclinado no Smith', 'Foco em peitoral com Smith.', 'peitoral', 'smith', 'image_pair', 'Supino Inclinado Smith/Supino Inclinado Smith.png', 'Supino Inclinado Smith/Supino Inclinado Smith.png', 'Supino Inclinado Smith/Supino Inclinado Smith2.png'),
  ('supino-reto-halteres', 'Supino Reto com Halteres', 'Foco em peitoral com halteres.', 'peitoral', 'halteres', 'image_pair', 'Supino Reto Halter/Supino Reto Halter 1.png', 'Supino Reto Halter/Supino Reto Halter 1.png', 'Supino Reto Halter/Supino Reto Halter 2.png'),
  ('supino-reto-maquina', 'Supino Reto na Máquina', 'Foco em peitoral com máquina.', 'peitoral', 'maquina', 'image_pair', 'Supino Reto Maquina/Supino Reto Maquina.png', 'Supino Reto Maquina/Supino Reto Maquina.png', 'Supino Reto Maquina/Supino Reto Maquina1.png'),
  ('supino-reto-smith', 'Supino Reto no Smith', 'Foco em peitoral com Smith.', 'peitoral', 'smith', 'image_pair', 'Supino Reto Smith/Supino Reto Smith1.png', 'Supino Reto Smith/Supino Reto Smith1.png', 'Supino Reto Smith/Supino Reto Smith2.png'),
  ('triceps-coice-cross', 'Tríceps Coice no Cross', 'Foco em tríceps com polia.', 'triceps', 'polia', 'image_pair', 'Triceps Coice no Cross/Triceps Coice no Cross1.jpg', 'Triceps Coice no Cross/Triceps Coice no Cross1.jpg', 'Triceps Coice no Cross/Triceps Coice no Cross2.jpg'),
  ('triceps-coice-halter', 'Tríceps Coice com Halter', 'Foco em tríceps com halteres.', 'triceps', 'halteres', 'image_pair', 'Triceps coice com halter/Triceps coice com halter1.jpg', 'Triceps coice com halter/Triceps coice com halter1.jpg', 'Triceps coice com halter/Triceps coice com halter2.jpg'),
  ('triceps-frances-barra-reta', 'Tríceps Francês com Barra Reta', 'Foco em tríceps com barra.', 'triceps', 'barra', 'image_pair', 'Triceps france com a barra reta/Triceps france com a barra reta1.jpg', 'Triceps france com a barra reta/Triceps france com a barra reta1.jpg', 'Triceps france com a barra reta/Triceps france com a barra reta2.jpg'),
  ('triceps-frances-barra-w', 'Tríceps Francês com Barra W', 'Foco em tríceps com barra.', 'triceps', 'barra', 'image_pair', 'triceps frances barra w/triceps frances barra w1.jpg', 'triceps frances barra w/triceps frances barra w1.jpg', 'triceps frances barra w/triceps frances barra w2.jpg'),
  ('triceps-frances-unilateral-halter', 'Tríceps Francês Unilateral com Halter', 'Foco em tríceps com halteres.', 'triceps', 'halteres', 'image_pair', 'Triceps frances unilateral com halter/Triceps frances unilateral com halter1.jpg', 'Triceps frances unilateral com halter/Triceps frances unilateral com halter1.jpg', 'Triceps frances unilateral com halter/Triceps frances unilateral com halter2.jpg'),
  ('triceps-no-banco', 'Tríceps no Banco', 'Foco em tríceps com peso corporal.', 'triceps', 'peso corporal', 'image_pair', 'Triceps no banco/Triceps no banco1.jpg', 'Triceps no banco/Triceps no banco1.jpg', 'Triceps no banco/Triceps no banco2.jpg'),
  ('triceps-polia-barra-v', 'Tríceps na Polia com Barra V', 'Foco em tríceps com polia.', 'triceps', 'polia', 'image_pair', 'Pulley triceps barra V1/Pulley triceps barra V1.jpg', 'Pulley triceps barra V1/Pulley triceps barra V1.jpg', 'Pulley triceps barra V1/Pulley triceps barra V2.jpg'),
  ('triceps-polia-corda', 'Tríceps na Polia com Corda', 'Foco em tríceps com polia.', 'triceps', 'polia', 'image_pair', 'Pulley triceps corda/Pulley triceps corda1.jpg', 'Pulley triceps corda/Pulley triceps corda1.jpg', 'Pulley triceps corda/Pulley triceps corda2.jpg'),
  ('triceps-polia-supinado-unilateral', 'Tríceps na Polia Supinado Unilateral', 'Foco em tríceps com polia.', 'triceps', 'polia', 'image_pair', 'Pulley triceps pegada supinada unilateral/Pulley triceps pegada supinada unilateral1.jpg', 'Pulley triceps pegada supinada unilateral/Pulley triceps pegada supinada unilateral1.jpg', 'Pulley triceps pegada supinada unilateral/Pulley triceps pegada supinada unilateral2.jpg'),
  ('triceps-testa-barra-reta', 'Tríceps Testa com Barra Reta', 'Foco em tríceps com barra.', 'triceps', 'barra', 'image_pair', 'Triceps testa com a barra reta/Triceps testa com a barra reta1.jpg', 'Triceps testa com a barra reta/Triceps testa com a barra reta1.jpg', 'Triceps testa com a barra reta/Triceps testa com a barra reta2.jpg'),
  ('triceps-testa-halter', 'Tríceps Testa com Halter', 'Foco em tríceps com halteres.', 'triceps', 'halteres', 'image_pair', 'Triceps testa com halter/Triceps testa com halter1.jpg', 'Triceps testa com halter/Triceps testa com halter1.jpg', 'Triceps testa com halter/Triceps testa com halter2.jpg')
on conflict (slug) do update set
  name             = excluded.name,
  description      = excluded.description,
  primary_muscle   = excluded.primary_muscle,
  equipment        = excluded.equipment,
  media_type       = excluded.media_type,
  thumbnail_path   = excluded.thumbnail_path,
  image_start_path = excluded.image_start_path,
  image_end_path   = excluded.image_end_path,
  is_active        = true;
