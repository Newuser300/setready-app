import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import QRCode from 'qrcode';

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#fdfaf6',
    padding: 50,
  },
  border: {
    border: '3pt solid #d4af37',
    padding: 40,
    height: '100%',
    position: 'relative',
  },
  innerBorder: {
    border: '1pt solid #d4af37',
    padding: 30,
    height: '100%',
  },
  header: {
    textAlign: 'center',
    marginBottom: 20,
  },
  logo: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#1a1a2e',
    letterSpacing: 4,
    marginBottom: 8,
  },
  logoSubtitle: {
    fontSize: 10,
    color: '#d4af37',
    letterSpacing: 2,
  },
  decorativeLine: {
    width: 100,
    height: 2,
    backgroundColor: '#d4af37',
    marginHorizontal: 'auto',
    marginVertical: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#1a1a2e',
    marginTop: 15,
  },
  subtitle: {
    fontSize: 12,
    textAlign: 'center',
    color: '#666',
    marginTop: 8,
  },
  recipientName: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 35,
    marginBottom: 15,
    color: '#d4af37',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  achievementText: {
    fontSize: 12,
    textAlign: 'center',
    color: '#555',
    marginTop: 15,
  },
  courseName: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 10,
    color: '#1a1a2e',
  },
  scoreBox: {
    backgroundColor: '#f0f4f8',
    padding: 10,
    marginTop: 20,
    marginBottom: 15,
    borderRadius: 8,
    width: 160,
    marginHorizontal: 'auto',
    textAlign: 'center',
  },
  scoreLabel: {
    fontSize: 10,
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  scoreValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#d4af37',
  },
  dateSection: {
    marginTop: 10,
    textAlign: 'center',
  },
  dateLabel: {
    fontSize: 10,
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 3,
  },
  dateValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  signatureSection: {
    marginTop: 20,
    alignItems: 'center',
  },
  signatureName: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1a1a2e',
    textAlign: 'center',
    marginBottom: 4,
  },
  signatureLine: {
    borderTopWidth: 1,
    borderTopColor: '#999',
    width: 200,
    marginBottom: 4,
  },
  signatureTitle: {
    fontSize: 9,
    color: '#666',
    textAlign: 'center',
  },
  goldSticker: {
    marginTop: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stickerCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#d4af37',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stickerInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fdfaf6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stickerStar: {
    fontSize: 11,
    color: '#d4af37',
    marginBottom: 1,
  },
  stickerText: {
    fontSize: 6,
    fontWeight: 'bold',
    color: '#d4af37',
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 50,
    left: 50,
    right: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  certificateId: {
    fontSize: 8,
    color: '#999',
  },
  qrCode: {
    width: 45,
    height: 45,
  },
  watermark: {
    position: 'absolute',
    bottom: 150,
    left: 0,
    right: 0,
    fontSize: 60,
    color: '#d4af37',
    opacity: 0.04,
    textAlign: 'center',
  },
});

interface CertificateData {
  recipientName: string;
  courseName: string;
  score: number;
  issueDate: string;
  certificateId: string;
}

export async function generateCertificatePDF(data: CertificateData): Promise<Buffer> {
  const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/verify/${data.certificateId}`;
  const qrCodeDataURL = await QRCode.toDataURL(verificationUrl, {
    width: 120,
    margin: 1,
    color: { dark: '#1a1a2e', light: '#ffffff' },
  });

  const CertificatePDF = () => (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.watermark}>BGREADY</Text>
        <View style={styles.border}>
          <View style={styles.innerBorder}>
            <View style={styles.header}>
              <Text style={styles.logo}>BGREADY</Text>
              <Text style={styles.logoSubtitle}>FILM INDUSTRY TRAINING</Text>
              <View style={styles.decorativeLine} />
            </View>
            
            <Text style={styles.title}>Certificate of Completion</Text>
            <Text style={styles.subtitle}>This certificate is proudly presented to</Text>
            <Text style={styles.recipientName}>{data.recipientName}</Text>
            <Text style={styles.achievementText}>for successfully completing the course</Text>
            <Text style={styles.courseName}>{data.courseName}</Text>
            
            <View style={styles.scoreBox}>
              <Text style={styles.scoreLabel}>Final Score</Text>
              <Text style={styles.scoreValue}>{data.score}%</Text>
            </View>
            
            <View style={styles.dateSection}>
              <Text style={styles.dateLabel}>Date of Achievement</Text>
              <Text style={styles.dateValue}>{data.issueDate}</Text>
            </View>
            
            <View style={styles.signatureSection}>
              <Text style={styles.signatureName}>M.B</Text>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureTitle}>Program Director</Text>
            </View>
            
            <View style={styles.goldSticker}>
              <View style={styles.stickerCircle}>
                <View style={styles.stickerInner}>
                  <Text style={styles.stickerStar}>★</Text>
                  <Text style={styles.stickerText}>VERIFIED</Text>
                  <Text style={styles.stickerText}>AUTHENTIC</Text>
                </View>
              </View>
            </View>
            
            <View style={styles.footer}>
              <Text style={styles.certificateId}>ID: {data.certificateId}</Text>
              <Image src={qrCodeDataURL} style={styles.qrCode} />
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );

  const { renderToBuffer } = await import('@react-pdf/renderer');
  const buffer = await renderToBuffer(<CertificatePDF />);
  return Buffer.from(buffer);
}