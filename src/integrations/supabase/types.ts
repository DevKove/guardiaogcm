export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      equipe: {
        Row: {
          id: string
          nome: string
          matricula: string | null
          tipo: "GCM" | "Vigia"
          funcao: string
          ativo: boolean
          observacao: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nome: string
          matricula?: string | null
          tipo?: "GCM" | "Vigia"
          funcao?: string
          ativo?: boolean
          observacao?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nome?: string
          matricula?: string | null
          tipo?: "GCM" | "Vigia"
          funcao?: string
          ativo?: boolean
          observacao?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      avisos: {
        Row: {
          autor_id: string
          created_at: string
          id: string
          mensagem: string
          nivel: string
          titulo: string
        }
        Insert: {
          autor_id?: string
          created_at?: string
          id?: string
          mensagem: string
          nivel?: string
          titulo: string
        }
        Update: {
          autor_id?: string
          created_at?: string
          id?: string
          mensagem?: string
          nivel?: string
          titulo?: string
        }
        Relationships: []
      }
      escalas: {
        Row: {
          agentes: string
          created_at: string
          criado_por: string
          data: string
          funcao: string
          hora_fim: string
          hora_inicio: string
          id: string
          observacao: string | null
          posto_id: string | null
          turno: string
          updated_at: string
          viatura_id: string | null
        }
        Insert: {
          agentes: string
          created_at?: string
          criado_por?: string
          data: string
          funcao?: string
          hora_fim?: string
          hora_inicio?: string
          id?: string
          observacao?: string | null
          posto_id?: string | null
          turno?: string
          updated_at?: string
          viatura_id?: string | null
        }
        Update: {
          agentes?: string
          created_at?: string
          criado_por?: string
          data?: string
          funcao?: string
          hora_fim?: string
          hora_inicio?: string
          id?: string
          observacao?: string | null
          posto_id?: string | null
          turno?: string
          updated_at?: string
          viatura_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "escalas_posto_id_fkey"
            columns: ["posto_id"]
            isOneToOne: false
            referencedRelation: "postos_fixos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escalas_viatura_id_fkey"
            columns: ["viatura_id"]
            isOneToOne: false
            referencedRelation: "viaturas"
            referencedColumns: ["id"]
          },
        ]
      }
      escala_integrantes: {
        Row: { id: string; escala_id: string; equipe_id: string; created_at: string }
        Insert: { id?: string; escala_id: string; equipe_id: string; created_at?: string }
        Update: { id?: string; escala_id?: string; equipe_id?: string; created_at?: string }
        Relationships: [
          { foreignKeyName: "escala_integrantes_escala_id_fkey"; columns: ["escala_id"]; isOneToOne: false; referencedRelation: "escalas"; referencedColumns: ["id"] },
          { foreignKeyName: "escala_integrantes_equipe_id_fkey"; columns: ["equipe_id"]; isOneToOne: false; referencedRelation: "equipe"; referencedColumns: ["id"] },
        ]
      }
      itens: {
        Row: {
          id: string
          categoria: Database["public"]["Enums"]["item_categoria"]
          nome: string
          identificacao: string | null
          patrimonio: string | null
          ativo: boolean
          observacao: string | null
          criado_por: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          categoria: Database["public"]["Enums"]["item_categoria"]
          nome: string
          identificacao?: string | null
          patrimonio?: string | null
          ativo?: boolean
          observacao?: string | null
          criado_por?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          categoria?: Database["public"]["Enums"]["item_categoria"]
          nome?: string
          identificacao?: string | null
          patrimonio?: string | null
          ativo?: boolean
          observacao?: string | null
          criado_por?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      plantao_itens: {
        Row: {
          id: string
          plantao_id: string
          item_id: string
          status: Database["public"]["Enums"]["item_mov_status"]
          retirado_por: string | null
          retirado_em: string | null
          entregue_por: string | null
          entregue_em: string | null
          conferido_por: string | null
          conferido_em: string | null
          observacao: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          plantao_id: string
          item_id: string
          status?: Database["public"]["Enums"]["item_mov_status"]
          retirado_por?: string | null
          retirado_em?: string | null
          entregue_por?: string | null
          entregue_em?: string | null
          conferido_por?: string | null
          conferido_em?: string | null
          observacao?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          plantao_id?: string
          item_id?: string
          status?: Database["public"]["Enums"]["item_mov_status"]
          retirado_por?: string | null
          retirado_em?: string | null
          entregue_por?: string | null
          entregue_em?: string | null
          conferido_por?: string | null
          conferido_em?: string | null
          observacao?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plantao_itens_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "itens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plantao_itens_plantao_id_fkey"
            columns: ["plantao_id"]
            isOneToOne: false
            referencedRelation: "plantoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plantao_itens_retirado_por_fkey"
            columns: ["retirado_por"]
            isOneToOne: false
            referencedRelation: "equipe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plantao_itens_entregue_por_fkey"
            columns: ["entregue_por"]
            isOneToOne: false
            referencedRelation: "equipe"
            referencedColumns: ["id"]
          },
        ]
      }
      ocorrencia_envolvidos: {
        Row: {
          created_at: string
          criado_por: string
          documento: string | null
          id: string
          nome: string
          observacao: string | null
          ocorrencia_id: string
          telefone: string | null
          tipo: string
        }
        Insert: {
          created_at?: string
          criado_por?: string
          documento?: string | null
          id?: string
          nome: string
          observacao?: string | null
          ocorrencia_id: string
          telefone?: string | null
          tipo: string
        }
        Update: {
          created_at?: string
          criado_por?: string
          documento?: string | null
          id?: string
          nome?: string
          observacao?: string | null
          ocorrencia_id?: string
          telefone?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "ocorrencia_envolvidos_ocorrencia_id_fkey"
            columns: ["ocorrencia_id"]
            isOneToOne: false
            referencedRelation: "ocorrencias"
            referencedColumns: ["id"]
          },
        ]
      }
      ocorrencia_historico: {
        Row: {
          created_at: string
          descricao: string
          id: string
          ocorrencia_id: string
          usuario_id: string
        }
        Insert: {
          created_at?: string
          descricao: string
          id?: string
          ocorrencia_id: string
          usuario_id?: string
        }
        Update: {
          created_at?: string
          descricao?: string
          id?: string
          ocorrencia_id?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ocorrencia_historico_ocorrencia_id_fkey"
            columns: ["ocorrencia_id"]
            isOneToOne: false
            referencedRelation: "ocorrencias"
            referencedColumns: ["id"]
          },
        ]
      }
      ocorrencias: {
        Row: {
          bairro: string | null
          chegada_em: string | null
          created_at: string
          criado_por: string
          desfecho: string | null
          despachada_em: string | null
          encerrada_em: string | null
          endereco: string
          id: string
          latitude: number | null
          longitude: number | null
          natureza: string
          numero: string | null
          origem: string
          plantao_id: string | null
          posto_id: string | null
          prioridade: number
          protocolo: number
          referencia: string | null
          relato: string
          solicitante_nome: string | null
          solicitante_telefone: string | null
          status: Database["public"]["Enums"]["ocorrencia_status"]
          updated_at: string
          viatura: string | null
          viatura_id: string | null
        }
        Insert: {
          bairro?: string | null
          chegada_em?: string | null
          created_at?: string
          criado_por?: string
          desfecho?: string | null
          despachada_em?: string | null
          encerrada_em?: string | null
          endereco: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          natureza: string
          numero?: string | null
          origem?: string
          plantao_id?: string | null
          posto_id?: string | null
          prioridade?: number
          protocolo?: never
          referencia?: string | null
          relato: string
          solicitante_nome?: string | null
          solicitante_telefone?: string | null
          status?: Database["public"]["Enums"]["ocorrencia_status"]
          updated_at?: string
          viatura?: string | null
          viatura_id?: string | null
        }
        Update: {
          bairro?: string | null
          chegada_em?: string | null
          created_at?: string
          criado_por?: string
          desfecho?: string | null
          despachada_em?: string | null
          encerrada_em?: string | null
          endereco?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          natureza?: string
          numero?: string | null
          origem?: string
          plantao_id?: string | null
          posto_id?: string | null
          prioridade?: number
          protocolo?: never
          referencia?: string | null
          relato?: string
          solicitante_nome?: string | null
          solicitante_telefone?: string | null
          status?: Database["public"]["Enums"]["ocorrencia_status"]
          updated_at?: string
          viatura?: string | null
          viatura_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ocorrencias_plantao_id_fkey"
            columns: ["plantao_id"]
            isOneToOne: false
            referencedRelation: "plantoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ocorrencias_posto_id_fkey"
            columns: ["posto_id"]
            isOneToOne: false
            referencedRelation: "postos_fixos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ocorrencias_viatura_id_fkey"
            columns: ["viatura_id"]
            isOneToOne: false
            referencedRelation: "viaturas"
            referencedColumns: ["id"]
          },
        ]
      }
      plantao_integrantes: {
        Row: { id: string; plantao_id: string; equipe_id: string; created_at: string }
        Insert: { id?: string; plantao_id: string; equipe_id: string; created_at?: string }
        Update: { id?: string; plantao_id?: string; equipe_id?: string; created_at?: string }
        Relationships: [
          { foreignKeyName: "plantao_integrantes_plantao_id_fkey"; columns: ["plantao_id"]; isOneToOne: false; referencedRelation: "plantoes"; referencedColumns: ["id"] },
          { foreignKeyName: "plantao_integrantes_equipe_id_fkey"; columns: ["equipe_id"]; isOneToOne: false; referencedRelation: "equipe"; referencedColumns: ["id"] },
        ]
      }
      plantao_registros: {
        Row: {
          created_at: string
          criado_por: string
          hora: string
          id: string
          plantao_id: string
          texto: string
        }
        Insert: {
          created_at?: string
          criado_por?: string
          hora?: string
          id?: string
          plantao_id: string
          texto: string
        }
        Update: {
          created_at?: string
          criado_por?: string
          hora?: string
          id?: string
          plantao_id?: string
          texto?: string
        }
        Relationships: [
          {
            foreignKeyName: "plantao_registros_plantao_id_fkey"
            columns: ["plantao_id"]
            isOneToOne: false
            referencedRelation: "plantoes"
            referencedColumns: ["id"]
          },
        ]
      }
      plantoes: {
        Row: {
          assinatura_em: string | null
          assinatura_hash: string | null
          assinatura_metodo: string | null
          assinatura_nome: string | null
          assinatura_usuario_id: string | null
          atividades: string | null
          atividades_verso: string | null
          created_at: string
          data_inicio: string
          encerrado_em: string | null
          equipe: string | null
          guarnicoes: Json
          horario: string | null
          id: string
          informativo: string | null
          iniciado_em: string
          materiais: string | null
          observacoes: string | null
          operador_id: string
          operador_radio: string | null
          operador_radio_id: string | null
          nome_plantao: "ALPHA" | "BRAVO" | "CHARLIE" | "DELTA" | null
          supervisor_id: string | null
          postos: Json
          resumo: Json | null
          status: string
          supervisor: string | null
          turno: string
          updated_at: string
        }
        Insert: {
          assinatura_em?: string | null
          assinatura_hash?: string | null
          assinatura_metodo?: string | null
          assinatura_nome?: string | null
          assinatura_usuario_id?: string | null
          assinatura_em?: string | null
          assinatura_hash?: string | null
          assinatura_metodo?: string | null
          assinatura_nome?: string | null
          assinatura_usuario_id?: string | null
          atividades?: string | null
          atividades_verso?: string | null
          created_at?: string
          data_inicio?: string
          encerrado_em?: string | null
          equipe?: string | null
          guarnicoes?: Json
          horario?: string | null
          id?: string
          informativo?: string | null
          iniciado_em?: string
          materiais?: string | null
          observacoes?: string | null
          operador_id?: string
          operador_radio?: string | null
          operador_radio_id?: string | null
          nome_plantao?: "ALPHA" | "BRAVO" | "CHARLIE" | "DELTA" | null
          supervisor_id?: string | null
          postos?: Json
          resumo?: Json | null
          status?: string
          supervisor?: string | null
          turno: string
          updated_at?: string
        }
        Update: {
          atividades?: string | null
          atividades_verso?: string | null
          created_at?: string
          data_inicio?: string
          encerrado_em?: string | null
          equipe?: string | null
          guarnicoes?: Json
          horario?: string | null
          id?: string
          informativo?: string | null
          iniciado_em?: string
          materiais?: string | null
          observacoes?: string | null
          operador_id?: string
          operador_radio?: string | null
          postos?: Json
          resumo?: Json | null
          status?: string
          supervisor?: string | null
          turno?: string
          updated_at?: string
        }
        Relationships: [
          { foreignKeyName: "plantoes_supervisor_id_fkey"; columns: ["supervisor_id"]; isOneToOne: false; referencedRelation: "equipe"; referencedColumns: ["id"] },
          { foreignKeyName: "plantoes_operador_radio_id_fkey"; columns: ["operador_radio_id"]; isOneToOne: false; referencedRelation: "equipe"; referencedColumns: ["id"] },
        ]
      }
      postos_fixos: {
        Row: {
          ativo: boolean
          bairro: string | null
          created_at: string
          endereco: string | null
          horario: string | null
          id: string
          nome: string
          observacao: string | null
          responsavel: string | null
          telefone: string | null
          tipo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          bairro?: string | null
          created_at?: string
          endereco?: string | null
          horario?: string | null
          id?: string
          nome: string
          observacao?: string | null
          responsavel?: string | null
          telefone?: string | null
          tipo?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          bairro?: string | null
          created_at?: string
          endereco?: string | null
          horario?: string | null
          id?: string
          nome?: string
          observacao?: string | null
          responsavel?: string | null
          telefone?: string | null
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          matricula: string | null
          nome: string
        }
        Insert: {
          created_at?: string
          id: string
          matricula?: string | null
          nome?: string
        }
        Update: {
          created_at?: string
          id?: string
          matricula?: string | null
          nome?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      viatura_integrantes: {
        Row: { id: string; plantao_id: string; viatura_id: string; equipe_id: string; papel: "encarregado" | "condutor" | "auxiliar_1" | "auxiliar_2" | "integrante"; created_at: string }
        Insert: { id?: string; plantao_id: string; viatura_id: string; equipe_id: string; papel?: "encarregado" | "condutor" | "auxiliar_1" | "auxiliar_2" | "integrante"; created_at?: string }
        Update: { id?: string; plantao_id?: string; viatura_id?: string; equipe_id?: string; papel?: "encarregado" | "condutor" | "auxiliar_1" | "auxiliar_2" | "integrante"; created_at?: string }
        Relationships: [
          { foreignKeyName: "viatura_integrantes_plantao_id_fkey"; columns: ["plantao_id"]; isOneToOne: false; referencedRelation: "plantoes"; referencedColumns: ["id"] },
          { foreignKeyName: "viatura_integrantes_viatura_id_fkey"; columns: ["viatura_id"]; isOneToOne: false; referencedRelation: "viaturas"; referencedColumns: ["id"] },
          { foreignKeyName: "viatura_integrantes_equipe_id_fkey"; columns: ["equipe_id"]; isOneToOne: false; referencedRelation: "equipe"; referencedColumns: ["id"] },
        ]
      }
      viaturas: {
        Row: {
          ativa: boolean
          created_at: string
          guarnicao: string | null
          id: string
          km_atual: number | null
          modelo: string | null
          observacao: string | null
          ocorrencia_id: string | null
          placa: string | null
          prefixo: string
          status: Database["public"]["Enums"]["viatura_status"]
          tipo: string
          updated_at: string
        }
        Insert: {
          ativa?: boolean
          created_at?: string
          guarnicao?: string | null
          id?: string
          km_atual?: number | null
          modelo?: string | null
          observacao?: string | null
          ocorrencia_id?: string | null
          placa?: string | null
          prefixo: string
          status?: Database["public"]["Enums"]["viatura_status"]
          tipo?: string
          updated_at?: string
        }
        Update: {
          ativa?: boolean
          created_at?: string
          guarnicao?: string | null
          id?: string
          km_atual?: number | null
          modelo?: string | null
          observacao?: string | null
          ocorrencia_id?: string | null
          placa?: string | null
          prefixo?: string
          status?: Database["public"]["Enums"]["viatura_status"]
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "viaturas_ocorrencia_id_fkey"
            columns: ["ocorrencia_id"]
            isOneToOne: false
            referencedRelation: "ocorrencias"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      iniciar_plantao: {
        Args: {
          p_nome_plantao: string
          p_supervisor_id: string
          p_integrantes: string[]
          p_operador_radio_id?: string | null
          p_data_inicio?: string
          p_turno?: string | null
          p_horario?: string | null
        }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      ocorrencia_bloqueada: {
        Args: {
          _plantao_id: string
          _status: Database["public"]["Enums"]["ocorrencia_status"]
        }
        Returns: boolean
      }
      plantao_editavel: {
        Args: { _plantao_id: string; _user: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "supervisor" | "operador"
      item_categoria: "arma" | "radio" | "cad"
      item_mov_status: "pendente" | "retirado" | "devolvido" | "conferido"
      ocorrencia_status: "aberta" | "em_atendimento" | "encerrada" | "cancelada"
      viatura_status:
        | "disponivel"
        | "em_deslocamento"
        | "no_local"
        | "retornando"
        | "manutencao"
        | "fora_servico"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "supervisor", "operador"],
      ocorrencia_status: ["aberta", "em_atendimento", "encerrada", "cancelada"],
      item_categoria: ["arma", "radio", "cad"],
      item_mov_status: ["pendente", "retirado", "devolvido", "conferido"],
      viatura_status: [
        "disponivel",
        "em_deslocamento",
        "no_local",
        "retornando",
        "manutencao",
        "fora_servico",
      ],
    },
  },
} as const
