package vayla

import org.gradle.api.DefaultTask
import org.gradle.api.tasks.Input
import org.gradle.api.tasks.TaskAction

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
      setRequestProperty("Content-Type", "application/transit+json")
      setRequestProperty("Authorization", "Bearer " + System.env.VELHO_ACCESS_TOKEN)
      outputStream.withWriter { writer ->
        writer << '["~#\'",null]'
      }

      new File(fileName).newWriter().withWriter { w ->
        w << content.text
      }
    }
  }
}
