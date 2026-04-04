import axios from 'axios';

export interface RDResult {
  probability: number;
  jobId: string;
  status: string;
  rawData: any;
}

export async function submitToRD(fileUrl: string): Promise<string> {
  console.log('[RD] Submitting file URL...');
  
  const res = await axios.post(
    'https://api.realitydefender.com/api/upload',
    { url: fileUrl },
    {
      headers: {
        'Authorization': `Bearer ${process.env.REALITY_DEFENDER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    }
  );

  const jobId =
    res.data?.data?.request_id ||
    res.data?.request_id ||
    res.data?.id;

  if (!jobId) {
    console.error('[RD] Response:', JSON.stringify(res.data));
    throw new Error('No job ID in Reality Defender response');
  }

  console.log('[RD] Submitted. Job ID:', jobId);
  return jobId;
}

export async function pollRD(
  jobId: string,
  maxPolls = 20,
  intervalMs = 3000
): Promise<RDResult> {
  for (let i = 0; i < maxPolls; i++) {
    await new Promise(r => setTimeout(r, intervalMs));
    console.log(`[RD] Poll ${i + 1}/${maxPolls} for job: ${jobId}`);

    try {
      const res = await axios.get(
        `https://api.realitydefender.com/api/upload/${jobId}`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.REALITY_DEFENDER_API_KEY}`
          },
          timeout: 15000
        }
      );

      const data = res.data?.data || res.data;
      const status = (data?.status || '').toLowerCase();
      console.log('[RD] Status:', status, '| Data keys:', Object.keys(data || {}));

      if (['completed', 'finished', 'done', 'success'].includes(status)) {
        // Try every possible probability field RD might return
        const probability =
          data.probability ??
          data.manipulation_probability ??
          data.fake_probability ??
          data.deepfake_probability ??
          data.score ??
          data.result?.probability ??
          data.analysis?.score ?? 0;

        const finalProb = typeof probability === 'number'
          ? Math.min(1, Math.max(0, probability))
          : parseFloat(probability) || 0;

        console.log('[RD] Complete. Probability:', finalProb,
          '(', Math.round(finalProb * 100) + '%)');

        return {
          probability: finalProb,
          jobId,
          status,
          rawData: data
        };
      }

      if (['failed', 'error', 'rejected', 'cancelled'].includes(status)) {
        throw new Error(`Reality Defender job ${status}: ${jobId}`);
      }

    } catch (pollErr: any) {
      if (pollErr.message.includes('Reality Defender job')) throw pollErr;
      console.error(`[RD] Poll ${i + 1} error:`, pollErr.message);
      if (i === maxPolls - 1) throw pollErr;
    }
  }

  throw new Error('Reality Defender polling timed out after ' + maxPolls + ' attempts');
}
