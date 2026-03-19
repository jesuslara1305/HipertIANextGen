import { useNavigation } from "@react-navigation/native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../../providers/AuthProvider";
import { supabase } from "../services/supabase";

type BpMeasurement = {
  id: string;
  systolica: number | null;
  diastolica: number | null;
  measured_at: string;
};

type GlucoseMeasurement = {
  id: string;
  ayunas: number | null;
  postprandial: number | null;
  measured_at: string;
};

function formatDateTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleString("es-MX");
}

function escapeHtml(text: string) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export default function AjustesScreen() {
  const navigation = useNavigation<any>();
  const { session, signOut } = useAuth();
  const [exporting, setExporting] = useState(false);

  const email = session?.user?.email ?? "usuario@correo.com";

  // Función para calcular la edad basándose en la fecha de nacimiento (dob)
  const calcularEdad = (fechaNacimiento: string | null) => {
    if (!fechaNacimiento) return "No registrada";
    const hoy = new Date();
    const cumple = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - cumple.getFullYear();
    const m = hoy.getMonth() - cumple.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < cumple.getDate())) {
      edad--;
    }
    return edad;
  };

  const firstInitial = useMemo(
    () => email.trim().charAt(0).toUpperCase() || "U",
    [email],
  );

  const onExportar = async () => {
    if (!session?.user?.id) {
      Alert.alert("Error", "No se encontró la sesión del usuario.");
      return;
    }

    try {
      setExporting(true);

      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - 30);
      const fromIso = fromDate.toISOString();

      // Consultamos perfil y mediciones en paralelo
      const [
        { data: perfil },
        { data: presionData, error: presionError },
        { data: glucosaData, error: glucosaError },
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select(
            "first_name, last_name_paterno, last_name_materno, dob, sex_at_birth",
          )
          .eq("id", session.user.id)
          .single(),
        supabase
          .from("bp_measurements")
          .select("id, systolica, diastolica, measured_at")
          .eq("user_id", session.user.id)
          .gte("measured_at", fromIso)
          .order("measured_at", { ascending: false }),
        supabase
          .from("glucose_measurements")
          .select("id, ayunas, postprandial, measured_at")
          .eq("user_id", session.user.id)
          .gte("measured_at", fromIso)
          .order("measured_at", { ascending: false }),
      ]);

      if (presionError || glucosaError) {
        Alert.alert(
          "Error",
          "No se pudieron obtener las mediciones para exportar.",
        );
        return;
      }

      // Datos del usuario para el encabezado
      const nombreUsuario = perfil
        ? `${perfil.first_name} ${perfil.last_name_paterno} ${perfil.last_name_materno ?? ""}`.trim()
        : "No registrado";
      const edadUsuario = calcularEdad(perfil?.dob);
      const mapGenero: Record<string, string> = {
        male: "Masculino",
        female: "Femenino",
        other: "Otro",
      };

      const generoUsuario = perfil?.sex_at_birth
        ? mapGenero[perfil.sex_at_birth.toLowerCase()] || "No especificado"
        : "No especificado";

      const presion: BpMeasurement[] = (presionData ?? []).map((item: any) => ({
        id: item.id,
        systolica: item.systolica,
        diastolica: item.diastolica,
        measured_at: item.measured_at,
      }));

      const glucosa: GlucoseMeasurement[] = (glucosaData ?? []).map(
        (item: any) => ({
          id: item.id,
          ayunas: item.ayunas,
          postprandial: item.postprandial,
          measured_at: item.measured_at,
        }),
      );

      if (presion.length === 0 && glucosa.length === 0) {
        Alert.alert(
          "Sin datos",
          "No hay mediciones de presión arterial ni glucosa en los últimos 30 días para exportar.",
        );
        return;
      }

      const presionRows =
        presion.length > 0
          ? presion
              .map(
                (m) => `
          <tr>
            <td>${escapeHtml(formatDateTime(m.measured_at))}</td>
            <td>${m.systolica ?? "-"}</td>
            <td>${m.diastolica ?? "-"}</td>
          </tr>
        `,
              )
              .join("")
          : `
          <tr>
            <td colspan="3" style="text-align:center;color:#666;">Sin mediciones de presión arterial</td>
          </tr>
        `;

      const glucosaRows =
        glucosa.length > 0
          ? glucosa
              .map(
                (m) => `
          <tr>
            <td>${escapeHtml(formatDateTime(m.measured_at))}</td>
            <td>${m.ayunas ?? "-"}</td>
            <td>${m.postprandial ?? "-"}</td>
          </tr>
        `,
              )
              .join("")
          : `
          <tr>
            <td colspan="3" style="text-align:center;color:#666;">Sin mediciones de glucosa</td>
          </tr>
        `;

      const html = `
        <html>
          <head>
            <meta charset="utf-8" />
            <style>
              @page {
                size: A4;
                margin: 24px;
              }
              body {
                font-family: Arial, sans-serif;
                color: #111;
                font-size: 12px;
              }
              .report-header {
                margin-bottom: 18px;
                page-break-inside: avoid;
              }
              h1 {
                color: #007AFF;
                margin: 0 0 8px 0;
                font-size: 26px;
              }
              h2 {
                margin: 0 0 12px 0;
                color: #222;
                font-size: 18px;
              }
              p {
                margin: 4px 0;
                color: #444;
                font-size: 13px;
              }
              .section {
                margin-top: 24px;
                page-break-inside: auto;
              }
              .section-title {
                page-break-after: avoid;
                margin-bottom: 10px;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 10px;
                table-layout: fixed;
              }
              thead {
                display: table-header-group;
              }
              tfoot {
                display: table-footer-group;
              }
              tr {
                page-break-inside: avoid;
              }
              th, td {
                border: 1px solid #dcdcdc;
                padding: 10px;
                font-size: 12px;
                text-align: left;
                vertical-align: top;
                word-wrap: break-word;
              }
              th {
                background: #f3f7ff;
              }
              .footer {
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                text-align: right;
                font-size: 11px;
                color: #777;
              }
              .page-number:after { content: counter(page); }
              .total-pages:after { content: counter(pages); }
              .summary-box {
                background: #f8fbff;
                border: 1px solid #dcdcdc;
                border-radius: 8px;
                padding: 10px 12px;
                margin-top: 12px;
                page-break-inside: avoid;
              }
              .summary-title {
                font-weight: bold;
                margin-bottom: 6px;
                color: #222;
              }
            </style>
          </head>
          <body>
            <div class="report-header">
              <h1>Reporte de mediciones - HiperGIA</h1>
              <p><strong>Usuario:</strong> ${escapeHtml(nombreUsuario)}</p>
              <p><strong>Correo:</strong> ${escapeHtml(email)}</p>
              <p><strong>Edad:</strong> ${edadUsuario} años</p>
              <p><strong>Género:</strong> ${escapeHtml(generoUsuario)}</p>
              <p><strong>Periodo:</strong> Últimos 30 días</p>
              <p><strong>Generado:</strong> ${escapeHtml(new Date().toLocaleString("es-MX"))}</p>
            </div>

            <div class="section">
              <h2 class="section-title">Presión arterial</h2>
              <div class="summary-box">
                <div class="summary-title">Resumen</div>
                <p>Total de mediciones: <strong>${presion.length}</strong></p>
              </div>
              <table>
                <thead>
                  <tr>
                    <th style="width: 48%;">Fecha y hora</th>
                    <th style="width: 26%;">Sistólica</th>
                    <th style="width: 26%;">Diastólica</th>
                  </tr>
                </thead>
                <tbody>
                  ${presionRows}
                </tbody>
              </table>
            </div>

            <div class="section">
              <h2 class="section-title">Glucosa</h2>
              <div class="summary-box">
                <div class="summary-title">Resumen</div>
                <p>Total de mediciones: <strong>${glucosa.length}</strong></p>
              </div>
              <table>
                <thead>
                  <tr>
                    <th style="width: 48%;">Fecha y hora</th>
                    <th style="width: 26%;">Ayunas</th>
                    <th style="width: 26%;">Postprandial</th>
                  </tr>
                </thead>
                <tbody>
                  ${glucosaRows}
                </tbody>
              </table>
            </div>

            <div class="footer">
              Página <span class="page-number"></span> de <span class="total-pages"></span>
            </div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
      });

      const canShare = await Sharing.isAvailableAsync();

      if (!canShare) {
        Alert.alert(
          "PDF generado",
          "El dispositivo no permite compartir el archivo.",
        );
        return;
      }

      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        dialogTitle: "Exportar historial de HiperGIA",
        UTI: "com.adobe.pdf",
      });
    } catch (error) {
      Alert.alert("Error", "Ocurrió un problema al generar el PDF.");
    } finally {
      setExporting(false);
    }
  };

  const onCompartir = async () => {
    try {
      if (!session?.user?.id) {
        Alert.alert("Error", "No se encontró la sesión del usuario.");
        return;
      }

      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - 30);
      const fromIso = fromDate.toISOString();

      const [{ data: perfil }, { data: presionData }, { data: glucosaData }] =
        await Promise.all([
          supabase
            .from("profiles")
            .select(
              "first_name, last_name_paterno, last_name_materno, dob, sex_at_birth",
            )
            .eq("id", session.user.id)
            .single(),
          supabase
            .from("bp_measurements")
            .select("systolica, diastolica, measured_at")
            .eq("user_id", session.user.id)
            .gte("measured_at", fromIso)
            .order("measured_at", { ascending: false })
            .limit(5),
          supabase
            .from("glucose_measurements")
            .select("ayunas, postprandial, measured_at")
            .eq("user_id", session.user.id)
            .gte("measured_at", fromIso)
            .order("measured_at", { ascending: false })
            .limit(5),
        ]);

      if (
        (presionData?.length ?? 0) === 0 &&
        (glucosaData?.length ?? 0) === 0
      ) {
        Alert.alert(
          "Sin datos",
          "No hay mediciones en los últimos 30 días para compartir.",
        );
        return;
      }

      const nombreUsuario = perfil
        ? `${perfil.first_name} ${perfil.last_name_paterno} ${perfil.last_name_materno ?? ""}`.trim()
        : "No registrado";
      const edadUsuario = calcularEdad(perfil?.dob);
      const mapGenero: Record<string, string> = {
        male: "Masculino",
        female: "Femenino",
        other: "Otro",
      };

      const generoUsuario = perfil?.sex_at_birth
        ? mapGenero[perfil.sex_at_birth.toLowerCase()] || "No especificado"
        : "No especificado";

      const presionTexto =
        presionData && presionData.length > 0
          ? presionData
              .map(
                (m: any) =>
                  `${formatDateTime(m.measured_at)} → ${m.systolica}/${m.diastolica} mmHg`,
              )
              .join("\n")
          : "Sin mediciones registradas";

      const glucosaTexto =
        glucosaData && glucosaData.length > 0
          ? glucosaData
              .map((m: any) => {
                if (m.ayunas && m.postprandial) {
                  return `${formatDateTime(m.measured_at)} → ${m.ayunas}/${m.postprandial} mg/dL`;
                }
                if (m.ayunas) {
                  return `${formatDateTime(m.measured_at)} → ${m.ayunas} mg/dL (ayunas)`;
                }
                if (m.postprandial) {
                  return `${formatDateTime(m.measured_at)} → ${m.postprandial} mg/dL (postprandial)`;
                }
                return `${formatDateTime(m.measured_at)} → --`;
              })
              .join("\n")
          : "Sin mediciones registradas";

      const mensaje =
        `Historial de salud (últimos 30 días)\n\n` +
        `Usuario: ${nombreUsuario}\n` +
        `Correo: ${email}\n` +
        `Edad: ${edadUsuario} años\n` +
        `Género: ${generoUsuario}\n\n` +
        `Se comparten únicamente las 5 mediciones más recientes de cada tipo.\n\n` +
        `--- Presión arterial ---\n${presionTexto}\n\n` +
        `--- Glucosa ---\n${glucosaTexto}\n\n` +
        `Generado con la app HiperGIA.\n` +
        `Las mediciones incluidas son solo datos registrados, no interpretación médica.`;

      await Share.share({
        message: mensaje,
      });
    } catch (e) {
      Alert.alert("Error", "No se pudo compartir el historial.");
    }
  };

  const onPrivacidad = () => {
    Alert.alert(
      "Política de privacidad",
      `HiperGIA recopila únicamente la información necesaria para registrar tus mediciones de salud.

Los datos almacenados incluyen:
• Mediciones de presión arterial
• Mediciones de glucosa
• Fecha y hora de cada registro
• Correo electrónico del usuario

Esta información se utiliza únicamente para mostrar tu historial dentro de la aplicación y generar reportes personales.

HiperGIA no vende, comparte ni distribuye tu información a terceros.

El usuario es responsable del uso que haga de los datos exportados o compartidos.

Esta aplicación no sustituye el diagnóstico médico profesional.

Para cualquier duda sobre privacidad puedes contactar al soporte.`,
      [{ text: "Cerrar" }],
    );
  };

  const onTerminos = () => {
    Alert.alert(
      "Términos y condiciones",
      `El uso de HiperGIA implica la aceptación de los siguientes términos:

1. La aplicación está destinada únicamente para registro personal de mediciones.
2. Los datos mostrados no constituyen diagnóstico médico.
3. El usuario es responsable de la veracidad de las mediciones ingresadas.
4. La aplicación no se hace responsable por decisiones médicas tomadas a partir de la información registrada.
5. El usuario puede exportar o compartir su información bajo su propio criterio.

HiperGIA puede actualizar estos términos en futuras versiones de la aplicación.`,
      [{ text: "Aceptar" }],
    );
  };

  const onSoporte = () => {
    Alert.alert(
      "Ayuda y soporte",
      `Centro de soporte HiperGIA

Correo:
soporte@hipergia.app

Teléfono:
+52 229 555 3812

Horario de atención:
Lunes a Jueves
10:00 AM - 6:00 PM

Nuestro equipo puede ayudarte con:
• Problemas con tu cuenta
• Errores en la aplicación
• Dudas sobre exportación de datos
• Soporte técnico general`,
      [{ text: "Cerrar" }],
    );
  };

  const onCerrarSesion = async () => {
    await signOut();

    navigation.reset({
      index: 0,
      routes: [{ name: "LoginScreen" }],
    });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: 150 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.perfil}>
        <View style={styles.avatar}>
          <Text style={styles.inicial}>{firstInitial}</Text>
        </View>
        <Text style={styles.nombre}>{email}</Text>
      </View>

      <TouchableOpacity
        activeOpacity={0.9}
        style={styles.miPerfil}
        onPress={() => navigation.navigate("MiPerfilScreen")}
      >
        <Text style={styles.miPerfilTexto}>Mi perfil</Text>
        <Text style={styles.cambiar}>Ver</Text>
      </TouchableOpacity>

      <View style={styles.section}>
        <ItemAjuste
          titulo="Exportar datos (PDF)"
          subtitulo="Descarga tu historial de los últimos 30 días"
          accion={
            <TouchableOpacity onPress={onExportar} disabled={exporting}>
              <Text style={styles.cambiar}>
                {exporting ? "Exportando..." : "Exportar"}
              </Text>
            </TouchableOpacity>
          }
        />

        <ItemAjuste
          titulo="Compartir por WhatsApp"
          accion={
            <TouchableOpacity onPress={onCompartir} style={styles.whatsBtn}>
              <Image
                source={require("../assets/iconos/whatsapp.png")}
                style={styles.whatsIcon}
                resizeMode="contain"
              />
              <Text style={styles.cambiar}>Compartir...</Text>
            </TouchableOpacity>
          }
          noBorder
        />
      </View>

      <View style={styles.section}>
        <ItemAjuste
          titulo="Privacidad"
          accion={
            <TouchableOpacity onPress={onPrivacidad}>
              <Text style={styles.cambiar}>Ver</Text>
            </TouchableOpacity>
          }
        />

        <ItemAjuste
          titulo="Términos y condiciones"
          accion={
            <TouchableOpacity onPress={onTerminos}>
              <Text style={styles.cambiar}>Ver</Text>
            </TouchableOpacity>
          }
        />

        <ItemAjuste
          titulo="Ayuda y soporte"
          accion={
            <TouchableOpacity onPress={onSoporte}>
              <Text style={styles.cambiar}>Ver</Text>
            </TouchableOpacity>
          }
          noBorder
        />
      </View>

      <TouchableOpacity
        activeOpacity={0.9}
        style={styles.logout}
        onPress={onCerrarSesion}
      >
        <Text style={styles.logoutTexto}>Cerrar sesión</Text>
      </TouchableOpacity>

      <Text style={styles.version}>V 1.0.2</Text>
    </ScrollView>
  );
}

function ItemAjuste({
  titulo,
  subtitulo,
  accion,
  noBorder,
}: {
  titulo: string;
  subtitulo?: string;
  accion?: React.ReactNode;
  noBorder?: boolean;
}) {
  return (
    <View style={[styles.item, noBorder && { borderBottomWidth: 0 }]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.itemTitulo}>{titulo}</Text>
        {subtitulo ? (
          <Text style={styles.itemSubtitulo}>{subtitulo}</Text>
        ) : null}
      </View>
      {accion}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f7f7f7" },
  content: { padding: 20 },
  perfil: { alignItems: "center", marginBottom: 10 },
  avatar: {
    backgroundColor: "#cce2ff",
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: "center",
    alignItems: "center",
  },
  inicial: { fontSize: 32, color: "#007AFF", fontWeight: "bold" },
  nombre: { marginTop: 10, fontSize: 18, fontWeight: "600" },
  miPerfil: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginVertical: 10,
    elevation: 1,
  },
  miPerfilTexto: { fontSize: 16, fontWeight: "500" },
  section: {
    marginBottom: 20,
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 8,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomColor: "#eee",
    borderBottomWidth: 1,
  },
  itemTitulo: { fontSize: 16, fontWeight: "600" },
  itemSubtitulo: { fontSize: 13, color: "#777", marginTop: 2 },
  cambiar: { color: "#007AFF", fontWeight: "600" },
  whatsBtn: { flexDirection: "row", alignItems: "center" },
  whatsIcon: { width: 26, height: 26, marginRight: 8, opacity: 0.6 },
  logout: {
    borderWidth: 1,
    borderColor: "#FF3B30",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
    backgroundColor: "#fff",
  },
  logoutTexto: { color: "#FF3B30", fontWeight: "bold", fontSize: 16 },
  version: { textAlign: "center", fontSize: 12, color: "#aaa", marginTop: 20 },
});
