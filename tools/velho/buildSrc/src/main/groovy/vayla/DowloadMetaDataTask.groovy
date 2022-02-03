package vayla

import org.gradle.api.DefaultTask
import org.gradle.api.tasks.Input
import org.gradle.api.tasks.TaskAction

import java.util.zip.GZIPInputStream

class DownloadMetaDataTask extends DefaultTask {

  @Input
  def fileName

  @TaskAction
  void createAction() {
    def baseUrl = new URL(System.env.VELHO_API_URL + "/metatietopalvelu/api/v2/metatiedot")
    def connection = baseUrl.openConnection()
    connection.with {
      doOutput = true
      requestMethod = 'POST'
      setRequestProperty("accept", "application/json")
      setRequestProperty("accept-encoding", "gzip")
      setRequestProperty("content-type", "application/json")
      setRequestProperty("Authorization", "Bearer " + System.env.VELHO_ACCESS_TOKEN)
      outputStream.withWriter { writer ->
        writer << 'null'
      }
    }

    def is = new GZIPInputStream(connection.getInputStream())
    def br = new BufferedReader(new InputStreamReader(is))
    def writer = new File(fileName).newWriter()
    def line
    def buffer = new char[20000]
    do {
      def read = br.read(buffer)
      if (read <= 0) break;
      writer.write(buffer, 0, read);
    } while (true)
    writer.flush()
  }
}
